package com.callstack.react.brownfield.shared

import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import groovy.util.NodeList
import org.gradle.api.Project
import org.gradle.api.publish.PublishingExtension
import org.gradle.api.publish.maven.MavenPublication
import org.gradle.api.publish.tasks.GenerateModuleMetadata
import java.io.File

/**
 * Injects a resolved set of transitive dependencies into the generated Maven POM and
 * Gradle Module Metadata (`module.json`) for every `MavenPublication` on [project], and
 * removes any existing entry (from the base publication or previously injected) that
 * [shouldExclude] matches. Used identically by the Expo and RNC-CLI transitive-dependency
 * paths — see docs/superpowers/specs/2026-09-04-bgp-transitive-dependencies-design.md §4.1/§4.3.
 */
class PublishingMetadataInjector(private val project: Project) {
    @Suppress("LongMethod")
    fun reconfigureGradleModuleJSON(
        dependencies: VersionMediatingDependencySet,
        shouldExclude: (groupId: String, artifactId: String) -> Boolean,
    ) {
        val removeDependenciesFromModuleFileTask =
            project.tasks.register("removeDependenciesFromModuleFile")
        removeDependenciesFromModuleFileTask.configure { task ->
            task.doLast {
                val moduleBuildDir = project.layout.buildDirectory.get()

                File("$moduleBuildDir/publications/mavenAar/module.json").run {
                    val json = inputStream().use { JsonSlurper().parse(it) as Map<*, *> }

                    dependencies.forEach { dependencyToAdd ->
                        @Suppress("UNCHECKED_CAST")
                        (json["variants"] as? List<MutableMap<String, Any>>)?.forEach { variant ->
                            (variant["dependencies"] as? MutableList<MutableMap<String, Any>>)?.add(
                                mutableMapOf<String, Any>(
                                    "group" to dependencyToAdd.groupId,
                                    "module" to dependencyToAdd.artifactId,
                                ).apply {
                                    dependencyToAdd.version?.let { version ->
                                        put("version", mapOf("requires" to version))
                                    }
                                },
                            )
                        }
                    }

                    @Suppress("UNCHECKED_CAST")
                    (json["variants"] as? List<MutableMap<String, Any>>)?.forEach { variant ->
                        (variant["dependencies"] as? MutableList<Map<String, Any>>)?.removeAll {
                            val group = it["group"] as String
                            val module = it["module"] as String
                            shouldExclude(group, module)
                        }

                        writer().use {
                            it.write(JsonOutput.prettyPrint(JsonOutput.toJson(json)))
                        }
                    }
                }
            }
        }

        project.tasks.withType(GenerateModuleMetadata::class.java)
            .configureEach {
                it.finalizedBy(removeDependenciesFromModuleFileTask.get())
            }
    }

    @Suppress("LongMethod")
    fun reconfigurePOM(
        dependencies: VersionMediatingDependencySet,
        shouldExclude: (groupId: String, artifactId: String) -> Boolean,
    ) {
        project.pluginManager.withPlugin("maven-publish") {
            project.extensions.configure(PublishingExtension::class.java) { publishing ->
                publishing.publications.withType(MavenPublication::class.java)
                    .configureEach { pub ->
                        pub.pom.withXml {
                            val root = it.asNode()
                            val dependenciesNodeList = root.get("dependencies") as NodeList
                            val dependenciesNode = dependenciesNodeList.first() as groovy.util.Node

                            dependencies.forEach { dependencyToAdd ->
                                val childTags =
                                    mutableMapOf(
                                        "groupId" to dependencyToAdd.groupId,
                                        "artifactId" to dependencyToAdd.artifactId,
                                        "scope" to dependencyToAdd.scope,
                                        "optional" to dependencyToAdd.optional.toString(),
                                    )

                                if (dependencyToAdd.version?.isNotBlank() == true) {
                                    childTags["version"] = dependencyToAdd.version
                                }

                                dependenciesNode.appendNode("dependency").let { newDepNode ->
                                    childTags.forEach { (tagName, tagValue) ->
                                        newDepNode.appendNode(tagName, tagValue)
                                    }
                                }
                            }

                            dependenciesNode.children()
                                .filterIsInstance<groovy.util.Node>()
                                .filter { dependency ->
                                    val groupId = (dependency["groupId"] as NodeList).text()
                                    val artifactId = (dependency["artifactId"] as NodeList).text()
                                    shouldExclude(groupId, artifactId)
                                }
                                .forEach { dependency ->
                                    dependenciesNode.remove(dependency)
                                }
                        }
                    }
            }
        }
    }
}
