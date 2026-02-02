package com.callstack.react.brownfield.plugin.expo

import com.android.build.gradle.LibraryExtension
import com.android.utils.forEach
import com.callstack.react.brownfield.plugin.RNBrownfieldPlugin.Companion.EXPO_PROJECT_LOCATOR
import com.callstack.react.brownfield.plugin.expo.utils.BrownfieldPublishingInfo
import com.callstack.react.brownfield.plugin.expo.utils.ExpoGradleProjectProjection
import com.callstack.react.brownfield.plugin.expo.utils.POMDependency
import com.callstack.react.brownfield.plugin.expo.utils.asExpoGradleProjectProjection
import com.callstack.react.brownfield.shared.Constants
import com.callstack.react.brownfield.shared.Logging
import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import org.gradle.api.Project
import org.gradle.api.publish.PublishingExtension
import org.gradle.api.publish.maven.MavenPublication
import org.gradle.api.publish.tasks.GenerateModuleMetadata
import org.w3c.dom.Node
import java.io.File
import javax.xml.parsers.DocumentBuilderFactory

fun Node.getChildNodeByName(nodeName: String): Node? {
    return childNodes
        .let { childNodes ->
            (0 until childNodes.length)
                .map { index -> childNodes.item(index) }
                .firstOrNull { node -> node.nodeName == nodeName }
        }
}


open class ExpoPublishingHelper(val brownfieldAppProject: Project) {
    fun configure() {
        brownfieldAppProject.evaluationDependsOn(EXPO_PROJECT_LOCATOR)

        brownfieldAppProject.afterEvaluate {
            val publishableExpoProjects = getPublishableExpoProjects()

            Logging.log(
                "Discovered ${publishableExpoProjects.size} publishable Expo projects: " + publishableExpoProjects.joinToString(
                    ", "
                ) { it.name })

            val discoveredExpoTransitiveDependencies = mutableSetOf<POMDependency>()
            publishableExpoProjects.forEach { expoProj ->
                val expoProjPOMDependencies = discoverExpoTransitiveDependenciesForPublication(
                    expoGPProjection = expoProj,
                )

                discoveredExpoTransitiveDependencies.addAll(expoProjPOMDependencies)
            }

            Logging.log("Discovered a total of ${discoveredExpoTransitiveDependencies.size} unique Expo transitive dependencies for brownfield app project publishing")
            discoveredExpoTransitiveDependencies.forEach {
                Logging.log("(*) dependency ${it.groupId}:${it.artifactId}:${it.version} (scope: ${it.scope}, ${if (it.optional) "optional" else "required"})")
            }

            reconfigurePOM(discoveredExpoTransitiveDependencies)
            reconfigureGradleModuleJSON(discoveredExpoTransitiveDependencies)
        }
    }

    protected fun shouldExcludeDependency(groupId: String, artifactId: String): Boolean {
        val isRootProjectArtifact =
            groupId == brownfieldAppProject.rootProject.name
        val isExpoArtifact =
            Constants.BROWNFIELD_EXPO_GROUP_IDS_BLACKLIST.contains(groupId)
//        val isRNArtifact = Constants.BROWNFIELD_RN_ARTIFACTS_BLACKLIST.contains(
//            FilterPackageInfo(
//                groupId = groupId,
//                artifactId = artifactId,
//            )
//        )

        return (isRootProjectArtifact || isExpoArtifact)
    }

    /**
     * Modifies the generated Gradle Module Metadata file to inject Expo transitive dependencies.
     * @param discoveredExpoTransitiveDependencies Set of POMDependency representing Expo transitive dependencies to add.
     */
    protected fun reconfigureGradleModuleJSON(discoveredExpoTransitiveDependencies: Set<POMDependency>) {
        val removeDependenciesFromModuleFileTask =
            brownfieldAppProject.tasks.register("removeDependenciesFromModuleFile")
        removeDependenciesFromModuleFileTask.configure { task ->
            task.doLast {
                val moduleBuildDir = brownfieldAppProject.layout.buildDirectory.get()

                File("$moduleBuildDir/publications/mavenAar/module.json").run {
                    val json = inputStream().use { JsonSlurper().parse(it) as Map<*, *> }

                    discoveredExpoTransitiveDependencies.forEach { dependencyToAdd ->
                        @Suppress("UNCHECKED_CAST")
                        (json["variants"] as? List<MutableMap<String, Any>>)?.forEach { variant ->
                            Logging.log(
                                "Injecting dependency to Gradle module JSON for variant '${variant["name"]}': ${dependencyToAdd.groupId}:${dependencyToAdd.artifactId}:${dependencyToAdd.version}"
                            )

                            (variant["dependencies"] as? MutableList<MutableMap<String, Any>>)?.add(
                                mutableMapOf<String, Any>(
                                    "group" to dependencyToAdd.groupId,
                                    "module" to dependencyToAdd.artifactId,
                                ).apply {
                                    dependencyToAdd.version?.let { version ->
                                        put(
                                            "version", mapOf(
                                                "requires" to version
                                            )
                                        )
                                    }
                                }
                            )
                        }
                    }

                    @Suppress("UNCHECKED_CAST")
                    (json["variants"] as? List<MutableMap<String, Any>>)?.forEach { variant ->
                        (variant["dependencies"] as? MutableList<Map<String, Any>>)?.removeAll {
                            val group = it["group"] as String
                            val module = it["module"] as String

                            val shouldBeExcluded =
                                shouldExcludeDependency(
                                    groupId = group,
                                    artifactId = module
                                )

                            if (shouldBeExcluded) {
                                Logging.log(
                                    "Removing excluded dependency from Gradle module JSON: $group:$module"
                                )
                            }

                            shouldBeExcluded
                        }

                        writer().use {
                            it.write(
                                JsonOutput.prettyPrint(
                                    JsonOutput.toJson(
                                        json
                                    )
                                )
                            )
                        }
                    }
                }
            }
        }

//        brownfieldAppProject.tasks.named("generateMetadataFileForMavenAarPublication") {
        brownfieldAppProject.tasks.withType(GenerateModuleMetadata::class.java)
            .configureEach {
                it.finalizedBy(removeDependenciesFromModuleFileTask.get())
            }
    }

    /**
     * Modifies the generated Maven POM file to inject Expo transitive dependencies.
     * @param discoveredExpoTransitiveDependencies Set of POMDependency representing Expo transitive dependencies to add.
     */
    protected fun reconfigurePOM(discoveredExpoTransitiveDependencies: Set<POMDependency>) {
        brownfieldAppProject.pluginManager.withPlugin("maven-publish") {
            brownfieldAppProject.extensions.configure(PublishingExtension::class.java) { publishing ->
                publishing.publications.withType(MavenPublication::class.java)
                    .configureEach { pub ->
                        Logging.log("Configuring POM for publication '${pub.name}' to include Expo transitive dependencies")

                        pub.pom.withXml {
                            val root = it.asNode()

                            // below: obtains a view of the <dependencies> node(s) inside the POM XML; in practice, there should be only one such node
                            val dependenciesNodeList =
                                root.get("dependencies") as groovy.util.NodeList
                            val dependenciesNode =
                                dependenciesNodeList.first() as groovy.util.Node

                            // below: filter out dependencies that should be excluded
                            dependenciesNode.children()
                                .filterIsInstance<groovy.util.Node>()
                                .filter { dependency ->
                                    val groupId =
                                        (dependency["groupId"] as groovy.util.NodeList).text()
                                    val artifactId =
                                        (dependency["artifactId"] as groovy.util.NodeList).text()

                                    val shouldBeExcluded = shouldExcludeDependency(
                                        groupId = groupId,
                                        artifactId = artifactId
                                    )

                                    if (shouldBeExcluded) {
                                        Logging.log(
                                            "Removing excluded dependency from POM: $groupId:$artifactId"
                                        )
                                    }

                                    shouldBeExcluded
                                }
                                .forEach { dependency ->
                                    dependenciesNode.remove(dependency)
                                }

                            // below: inject the discovered Expo transitive dependencies into the POM's <dependencies> node
                            discoveredExpoTransitiveDependencies.forEach { dependencyToAdd ->
                                Logging.log(
                                    "Injecting dependency to POM: ${dependencyToAdd.groupId}:${dependencyToAdd.artifactId}:${dependencyToAdd.version}"
                                )

                                val childTags = mutableMapOf(
                                    "groupId" to dependencyToAdd.groupId,
                                    "artifactId" to dependencyToAdd.artifactId,
                                    "scope" to dependencyToAdd.scope,
                                    "optional" to dependencyToAdd.optional.toString()
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
                        }
                    }
            }
        }
    }

    fun discoverExpoTransitiveDependenciesForPublication(
        expoGPProjection: ExpoGradleProjectProjection,
    ): List<POMDependency> {
        val publication = getPublishingInfo(expoGPProjection)
            ?: throw IllegalStateException("Cannot configure publishing for Expo project ${expoGPProjection.name} - could not determine publishing info")

        val expoPkgLocalMavenRepo =
            File(expoGPProjection.sourceDir).parentFile.resolve("local-maven-repo")

        val pomFile =
            expoPkgLocalMavenRepo
                .resolve(
                    "${
                        publication.groupId.replace(
                            '.',
                            '/'
                        )
                    }/${publication.artifactId}/${publication.version}/${publication.artifactId}-${publication.version}.pom"
                )

        if (!pomFile.exists()) {
            throw IllegalStateException("Expo package '$expoGPProjection.name' does not have a POM file in its local-maven-repo: $pomFile")
        }

        val xml = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(pomFile)
        val dependenciesNodes = xml.getElementsByTagName("dependencies")

        val dependencies = mutableListOf<POMDependency>()

        dependenciesNodes.forEach { depNodeList ->
            depNodeList.childNodes.forEach { depNode ->
                // below: some nodes are not dependencies, but pure text, in which case their name is '#text'
                if (depNode.nodeName == "dependency") {
                    val groupId = depNode.getChildNodeByName("groupId")!!.textContent
                    val maybeArtifactId = depNode.getChildNodeByName("artifactId")

                    // below: the plugin already packs Expo packages inside the brownfield AAR, so only transitive
                    // deps are needed in the POM; Expo packages themselves should not be declared as dependencies
                    if (!shouldExcludeDependency(
                            groupId = groupId,
                            artifactId = maybeArtifactId?.textContent ?: ""
                        )
                    ) {
                        val artifactId = maybeArtifactId!!.textContent
                        val version = depNode.getChildNodeByName("version")?.textContent
                        val scope = depNode.getChildNodeByName("scope")?.textContent
                        val optional = depNode.getChildNodeByName("optional")?.textContent

                        val dependencyInfo = POMDependency(
                            groupId = groupId,
                            artifactId = artifactId,
                            version = version,
                            scope = scope ?: "compile",
                            optional = optional?.toBoolean() ?: false
                        )

                        dependencies.add(dependencyInfo)
                    }
                }
            }
        }

        Logging.log("Discovered ${dependencies.size} POM transitive dependencies for Expo project '${expoGPProjection.name}'")

        return dependencies
    }

    protected fun getPublishableExpoProjects(): List<ExpoGradleProjectProjection> {
        val expoExtension =
            (brownfieldAppProject.rootProject.gradle.extensions.findByType(Class.forName("expo.modules.plugin.ExpoGradleExtension"))
                ?: throw IllegalStateException(
                    "Expo Gradle extension not found. This should never happen in an Expo project."
                ))

        // expoExtension.config
        val config = expoExtension.javaClass
            .getMethod("getConfig")
            .invoke(expoExtension)

        // ...config.allProjects - each project is actually a data class expo.modules.plugin.configuration.GradleProject
        val allProjects = config.javaClass
            .getMethod("getAllProjects")
            .invoke(config) as? Iterable<*>

        // ...filter { it.usePublication }
        @Suppress("UNCHECKED_CAST")
        return allProjects!!
            .filterNotNull()
            // expoInternalProject is a data class - expo.modules.plugin.configuration.GradleProject
            // since Expo itself is not provided via Maven but added via local node_modules
            // and this plugin supports RN Vanilla projects, it is not possible to have
            // a dependency on Expo's APIs; therefore, access happens via reflection,
            // which in turn is hidden behind the ReflectionUtils.wrapObjectProxy abstraction
            // here provided by the asExpoGradleProjectProjection() extension fun; effectively,
            // this means access is provided via a proxy exposing conformant partial interfaces,
            // to which the original entities are projected
            .map { expoGradleProject -> expoGradleProject.asExpoGradleProjectProjection() }
            .filter { expoGradleProjectProjection ->
                return@filter expoGradleProjectProjection.usePublication
            }
    }

    fun getPublishingInfo(expoGPProjection: ExpoGradleProjectProjection): BrownfieldPublishingInfo? {
        return (expoGPProjection.publication?.let {
            BrownfieldPublishingInfo(
                groupId = it.groupId,
                artifactId = it.artifactId,
                version = it.version,
            )
        } ?: run {
            val targetProject =
                brownfieldAppProject.rootProject.allprojects.firstOrNull { it.projectDir.absoluteFile.path == expoGPProjection.sourceDir }

            if (targetProject == null) {
                return null
            }

            val targetProjectAndroidLibExt =
                targetProject.extensions.getByType(LibraryExtension::class.java)

            val packagePieces = targetProjectAndroidLibExt.namespace!!.split(".")
            val artifactId = packagePieces.last()
            // below: remove the trailing artifactId component -> leaves only the groupId components
            val groupId = packagePieces.dropLast(1).joinToString(".")

            (BrownfieldPublishingInfo(
                groupId = groupId,
                artifactId = artifactId,
                version = (targetProjectAndroidLibExt.defaultConfig.versionName
                    ?: targetProject.version.toString()),
            ))
        })
    }
}