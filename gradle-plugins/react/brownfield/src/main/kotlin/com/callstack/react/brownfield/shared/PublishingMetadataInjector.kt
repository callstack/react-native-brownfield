package com.callstack.react.brownfield.shared

import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import groovy.util.NodeList
import org.gradle.api.Project
import org.gradle.api.publish.PublishingExtension
import org.gradle.api.publish.maven.MavenPublication
import org.gradle.api.publish.tasks.GenerateModuleMetadata

/**
 * Injects a resolved set of transitive dependencies into the generated Maven POM and
 * Gradle Module Metadata (`module.json`) for every `MavenPublication` on [project], and
 * removes any existing entry (from the base publication or previously injected) that
 * the configured exclusion predicate matches. Used identically by the Expo and RNC-CLI
 * transitive-dependency paths.
 *
 * The module.json injector task(s) and the POM `withXml` hook are both wired up here,
 * eagerly, as soon as this class is constructed — not deferred to `afterEvaluate`, per
 * Gradle's own guidance against registering tasks from within `afterEvaluate`. The actual
 * dependency set isn't known until `afterEvaluate` (it depends on the consuming project's
 * own extension configuration and on other projects' resolved dependencies), so [configure]
 * only *supplies* that value to what's already registered; it doesn't register anything new.
 * Until [configure] is called, injection stays disabled and these hooks are no-ops.
 */
class PublishingMetadataInjector(private val project: Project) {
    private var dependencies = VersionMediatingDependencySet()
    private var shouldExclude: (groupId: String, artifactId: String) -> Boolean = { _, _ -> false }
    private var enabled = false

    init {
        registerModuleJsonInjectors()
        registerPomInjector()
    }

    /** Supplies the dependencies to inject and enables injection on the hooks registered in [init]. */
    fun configure(
        dependencies: VersionMediatingDependencySet,
        shouldExclude: (groupId: String, artifactId: String) -> Boolean,
    ) {
        this.dependencies = dependencies
        this.shouldExclude = shouldExclude
        this.enabled = true
    }

    @Suppress("LongMethod")
    private fun registerModuleJsonInjectors() {
        // A single task, registered once here (not one-per-publication registered lazily from
        // inside a GenerateModuleMetadata configureEach callback — that crashes with
        // "DefaultTaskContainer#register(String) ... cannot be executed in the current context"
        // when Gradle happens to realize a GenerateModuleMetadata task while resolving some
        // other task's dependencies, e.g. mergeClasses<Variant>, rather than during plain
        // configuration). This task instead walks every GenerateModuleMetadata task's own
        // `outputFile` at execution time — by then all such tasks are fully realized, so this
        // is safe — which is also what keeps it publication-name agnostic (no hardcoded
        // "mavenAar" path).
        val removeDependenciesFromModuleFileTask = project.tasks.register("removeDependenciesFromModuleFile")
        removeDependenciesFromModuleFileTask.configure { task ->
            task.onlyIf { enabled }
            task.doLast {
                project.tasks.withType(GenerateModuleMetadata::class.java).forEach { metadataTask ->
                    val moduleFile = metadataTask.outputFile.get().asFile
                    if (!moduleFile.exists()) return@forEach

                    val json = moduleFile.inputStream().use { JsonSlurper().parse(it) as Map<*, *> }

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
                    }

                    moduleFile.writer().use {
                        it.write(JsonOutput.prettyPrint(JsonOutput.toJson(json)))
                    }
                }
            }
        }

        // Wiring an already-registered task as a finalizer via a lazy reference is safe to do
        // from configureEach (unlike registering a *new* task there, see above).
        project.tasks.withType(GenerateModuleMetadata::class.java).configureEach { metadataTask ->
            metadataTask.finalizedBy(removeDependenciesFromModuleFileTask)
        }
    }

    @Suppress("LongMethod")
    private fun registerPomInjector() {
        project.pluginManager.withPlugin("maven-publish") {
            project.extensions.configure(PublishingExtension::class.java) { publishing ->
                publishing.publications.withType(MavenPublication::class.java)
                    .configureEach { pub ->
                        pub.pom.withXml {
                            if (!enabled) return@withXml

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
