package com.callstack.react.brownfield.expo

import com.android.utils.forEach
import com.callstack.react.brownfield.expo.utils.ExpoGradleProjectProjection
import com.callstack.react.brownfield.expo.utils.LocalMavenUtils
import com.callstack.react.brownfield.expo.utils.asExpoGradleProjectProjection
import com.callstack.react.brownfield.shared.Constants
import com.callstack.react.brownfield.shared.DependencyInfo
import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.shared.VersionMediatingDependencySet
import org.gradle.api.Project
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
    fun configure(): List<ExpoGradleProjectProjection> {
        val discoverableExpoProjects = getDiscoverableExpoProjects()

        Logging.log(
            "Discovered ${discoverableExpoProjects.size} discoverable Expo projects: " +
                discoverableExpoProjects.joinToString(
                    ", ",
                ) { it.name },
        )

        val expoTransitiveDependencies =
            discoverAllExpoTransitiveDependencies(
                expoProjects = discoverableExpoProjects,
            )

        Logging.log(
            "Collected a total of ${expoTransitiveDependencies.size} unique Expo transitive " +
                "dependencies for brownfield app project publishing",
        )
        expoTransitiveDependencies.forEach {
            Logging.log(
                "(*) dependency ${it.groupId}:${it.artifactId}:${it.version} (scope: ${it.scope}, " +
                    "${if (it.optional) "optional" else "required"})",
            )
        }

        return discoverableExpoProjects
    }

    internal fun shouldExcludeDependency(
        groupId: String,
        artifactId: String,
    ): Boolean {
        val isRootProjectArtifact =
            groupId == brownfieldAppProject.rootProject.name
        val isExpoArtifact =
            Constants.BROWNFIELD_EXPO_TRANSITIVE_DEPS_ARTIFACTS_BLACKLIST.any {
                it.matches(
                    groupId = groupId,
                    artifactId = artifactId,
                )
            }

        return (isRootProjectArtifact || isExpoArtifact)
    }

    fun discoverAllExpoTransitiveDependencies(expoProjects: Iterable<ExpoGradleProjectProjection>): VersionMediatingDependencySet {
        var discoveredExpoTransitiveDependencies = VersionMediatingDependencySet()
        expoProjects.forEach { expoProj ->
            val maybeTransitiveDepsForProj =
                discoverExpoTransitiveDependenciesForPublication(
                    expoGPProjection = expoProj,
                )

            if (maybeTransitiveDepsForProj != null) {
                discoveredExpoTransitiveDependencies.addAll(
                    maybeTransitiveDepsForProj,
                )
            }
        }

        discoveredExpoTransitiveDependencies =
            discoveredExpoTransitiveDependencies.filter {
                shouldExcludeDependency(
                    groupId = it.groupId,
                    artifactId = it.artifactId,
                ).not()
            }

        return discoveredExpoTransitiveDependencies
    }

    fun discoverExpoTransitiveDependenciesForPublication(expoGPProjection: ExpoGradleProjectProjection): VersionMediatingDependencySet? {
        val publication =
            LocalMavenUtils.getPublishingInfo(expoGPProjection, brownfieldAppProject)
                ?: error(LocalMavenUtils.publishingNotFound(expoGPProjection.name))

        val pkgProjectDir = File(expoGPProjection.sourceDir)
        val pkgProject =
            brownfieldAppProject.rootProject.allprojects.find {
                it.projectDir.canonicalFile == pkgProjectDir.canonicalFile
            }
        val expoPkgLocalMavenRepo = pkgProjectDir.parentFile.resolve("local-maven-repo")
        val pomFile = LocalMavenUtils.getPomFile(expoPkgLocalMavenRepo, publication)

        val dependencies = VersionMediatingDependencySet()
        var depsDiscoverySource: String

        if (pomFile.exists()) {
            // firstly, try reading transitive dependencies from the POM file
            val xml = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(pomFile)

            depsDiscoverySource = "POM file"

            appendExpoTransitiveDependenciesFromMavenPOM(
                xml.getElementsByTagName("dependencies"),
                dependencies,
            )
        } else if (pkgProject != null) {
            // as fallback, iterate Gradle's resolved dependencies for the Expo project
            depsDiscoverySource = "Gradle resolved dependencies"

            appendExpoTransitiveDependenciesFromGradle(pkgProject, dependencies)
        } else {
            // if no POM & no Gradle project have been resolved, there is no source for the data

            Logging.log(
                "WARNING: Could not discover transitive dependencies for Expo project '${expoGPProjection.name}' " +
                    "- no POM file found at expected location $pomFile and no Gradle project could be " +
                    "resolved for Expo project located at ${expoGPProjection.sourceDir}",
            )

            return null
        }

        // below: the plugin already packs Expo packages inside the brownfield AAR, so only transitive
        // deps are needed in the POM; Expo packages themselves should not be declared as dependencies
        dependencies.removeAll { dep ->
            shouldExcludeDependency(
                groupId = dep.groupId,
                artifactId = dep.artifactId,
            )
        }

        Logging.log(
            "Discovered ${dependencies.size} transitive dependencies for Expo project " +
                "'${expoGPProjection.name}' from $depsDiscoverySource",
        )

        return dependencies
    }

    protected fun appendExpoTransitiveDependenciesFromMavenPOM(
        dependenciesNodes: org.w3c.dom.NodeList,
        dependencies: VersionMediatingDependencySet,
    ) {
        dependenciesNodes.forEach { depNodeList ->
            depNodeList.childNodes.forEach { depNode ->
                /**
                 * below: some nodes are not dependencies, but pure text, in which case their name is '#text'
                 */
                if (depNode.nodeName == "dependency") {
                    val groupId = depNode.getChildNodeByName("groupId")!!.textContent
                    val maybeArtifactId = depNode.getChildNodeByName("artifactId")

                    val artifactId = maybeArtifactId!!.textContent
                    val version = depNode.getChildNodeByName("version")?.textContent
                    val optional = depNode.getChildNodeByName("optional")?.textContent
                    val scope = depNode.getChildNodeByName("scope")?.textContent
                    val dependencyInfo =
                        DependencyInfo(
                            groupId = groupId,
                            artifactId = artifactId,
                            version = version,
                            scope = scope ?: "compile",
                            optional = optional?.toBoolean() ?: false,
                        )

                    dependencies.add(dependencyInfo)
                }
            }
        }
    }

    protected fun appendExpoTransitiveDependenciesFromGradle(
        pkgProject: Project,
        dependencies: VersionMediatingDependencySet,
    ) {
        /**
         * Not accounting for variant specific configurations as Expo packages are not
         * using it. Should we face any issues/needs to account for it, we can do it here.
         */
        listOf("implementation", "api", "runtimeOnly").forEach {
            val configuration = pkgProject.configurations.findByName(it)
            configuration?.dependencies?.forEach { dep ->
                if (dep.group != null) {
                    dependencies.add(
                        DependencyInfo.fromGradleDep(
                            groupId = dep.group!!,
                            artifactId = dep.name,
                            version = dep.version,
                        ),
                    )
                }
            }
        }
    }

    /**
     * Discovers Expo projects in the current brownfield app project that are marked for publication.
     * @return List of ExpoGradleProjectProjection representing the discoverable Expo projects.
     */
    fun getDiscoverableExpoProjects(): List<ExpoGradleProjectProjection> {
        val expoExtension =
            brownfieldAppProject.rootProject.gradle.extensions.findByType(Class.forName("expo.modules.plugin.ExpoGradleExtension"))
                ?: error("Expo Gradle extension not found. This should never happen in an Expo project.")

        // expoExtension.config
        val config =
            expoExtension.javaClass
                .getMethod("getConfig")
                .invoke(expoExtension)

        // ...config.allProjects - each project is actually a data class expo.modules.plugin.configuration.GradleProject
        val allProjects =
            config.javaClass
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
                return@filter expoGradleProjectProjection.usePublication ||
                    Constants.BROWNFIELD_EXPO_TRANSITIVE_DEPS_WHITELISTED_MODULES_FOR_DISCOVERY.contains(
                        expoGradleProjectProjection.name,
                    )
            }
    }
}
