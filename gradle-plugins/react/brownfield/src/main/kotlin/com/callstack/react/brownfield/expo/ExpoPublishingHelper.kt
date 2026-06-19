package com.callstack.react.brownfield.expo

import com.android.utils.forEach
import com.callstack.react.brownfield.expo.utils.DependencyInfo
import com.callstack.react.brownfield.expo.utils.ExpoGradleProjectProjection
import com.callstack.react.brownfield.expo.utils.LocalMavenUtils
import com.callstack.react.brownfield.expo.utils.VersionMediatingDependencySet
import com.callstack.react.brownfield.expo.utils.asExpoGradleProjectProjection
import com.callstack.react.brownfield.shared.Constants
import com.callstack.react.brownfield.shared.Logging
import groovy.json.JsonOutput
import groovy.json.JsonSlurper
import groovy.util.NodeList
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
    protected fun normalizedDependencyVersion(version: String?): String? =
        version?.trim()?.takeUnless { it.isEmpty() || it == "null" || it == "unspecified" }

    protected fun compileOnlyApiDeclaredDependencies(): Set<Pair<String, String>> =
        listOf("compileOnlyApi")
            .mapNotNull { brownfieldAppProject.configurations.findByName(it) }
            .flatMap { configuration ->
                configuration.dependencies.mapNotNull { dependency ->
                    val group = dependency.group
                    if (group.isNullOrBlank()) null else group to dependency.name
                }
            }.toSet()

    protected fun declaredBrownfieldDependencies(): Set<Pair<String, String>> =
        listOf("api", "implementation", "compileOnly", "compileOnlyApi", "runtimeOnly")
            .mapNotNull { brownfieldAppProject.configurations.findByName(it) }
            .flatMap { configuration ->
                configuration.dependencies.mapNotNull { dependency ->
                    val group = dependency.group
                    if (group.isNullOrBlank()) null else group to dependency.name
                }
            }.toSet()

    protected fun existingModuleDependencies(variant: Map<String, Any>): Set<Pair<String, String>> =
        (variant["dependencies"] as? List<Map<String, Any>>)
            .orEmpty()
            .mapNotNull { dependency ->
                val group = dependency["group"] as? String
                val module = dependency["module"] as? String
                if (group != null && module != null) group to module else null
            }.toSet()

    protected fun existingPomDependencies(dependenciesNode: groovy.util.Node): Set<Pair<String, String>> =
        dependenciesNode.children()
            .filterIsInstance<groovy.util.Node>()
            .mapNotNull { dependency ->
                val group = (dependency.get("groupId") as? NodeList)?.text()
                val module = (dependency.get("artifactId") as? NodeList)?.text()
                if (group.isNullOrBlank() || module.isNullOrBlank()) null else group to module
            }.toSet()

    protected fun shouldPublishDependency(
        dependencyInfo: DependencyInfo,
        location: String,
        variantName: String? = null,
    ): Boolean {
        if (normalizedDependencyVersion(dependencyInfo.version) != null) {
            return true
        }

        val variantSuffix = variantName?.let { " for variant '$it'" }.orEmpty()
        Logging.log(
            "Skipping versionless dependency in $location$variantSuffix: " +
                "${dependencyInfo.groupId}:${dependencyInfo.artifactId}",
        )

        return false
    }

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

        reconfigurePOM(expoTransitiveDependencies)
        reconfigureGradleModuleJSON(expoTransitiveDependencies)

        return discoverableExpoProjects
    }

    protected fun shouldExcludeDependency(
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

    /**
     * Modifies the generated Gradle Module Metadata file to inject Expo transitive dependencies.
     * @param discoveredExpoTransitiveDependencies Set of DependencyInfo
     * representing Expo transitive dependencies to add.
     */
    @Suppress("LongMethod")
    protected fun reconfigureGradleModuleJSON(discoveredExpoTransitiveDependencies: VersionMediatingDependencySet) {
        val declaredDependencies = declaredBrownfieldDependencies()
        val compileOnlyApiDependencies = compileOnlyApiDeclaredDependencies()
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
                            val variantName = variant["name"] as? String
                            if (!shouldPublishDependency(dependencyToAdd, "Gradle module JSON", variantName)) {
                                return@forEach
                            }

                            if ((dependencyToAdd.groupId to dependencyToAdd.artifactId) in declaredDependencies) {
                                Logging.log(
                                    "Skipping brownfield-declared dependency for Gradle module JSON variant " +
                                        "'$variantName': ${dependencyToAdd.groupId}:${dependencyToAdd.artifactId}",
                                )
                                return@forEach
                            }

                            val existingDependencies = existingModuleDependencies(variant)
                            if ((dependencyToAdd.groupId to dependencyToAdd.artifactId) in existingDependencies) {
                                Logging.log(
                                    "Skipping duplicate dependency for Gradle module JSON variant " +
                                        "'$variantName': ${dependencyToAdd.groupId}:${dependencyToAdd.artifactId}",
                                )
                                return@forEach
                            }

                            Logging.log(
                                "Injecting dependency to Gradle module JSON for variant " +
                                    "'$variantName': ${dependencyToAdd.groupId}:" +
                                    "${dependencyToAdd.artifactId}:${dependencyToAdd.version}",
                            )

                            (variant["dependencies"] as? MutableList<MutableMap<String, Any>>)?.add(
                                mutableMapOf<String, Any>(
                                    "group" to dependencyToAdd.groupId,
                                    "module" to dependencyToAdd.artifactId,
                                ).apply {
                                    normalizedDependencyVersion(dependencyToAdd.version)?.let { version ->
                                        put(
                                            "version",
                                            mapOf(
                                                "requires" to version,
                                            ),
                                        )
                                    }
                                },
                            )
                        }
                    }

                    @Suppress("UNCHECKED_CAST")
                    (json["variants"] as? List<MutableMap<String, Any>>)?.forEach { variant ->
                        val variantName = variant["name"] as? String
                        (variant["dependencies"] as? MutableList<Map<String, Any>>)?.removeAll {
                            val group = it["group"] as String
                            val module = it["module"] as String

                            val isCompileOnlyApiRuntimeLeak =
                                variantName?.contains("RuntimePublication") == true &&
                                    (group to module) in compileOnlyApiDependencies
                            val shouldBeExcluded =
                                isCompileOnlyApiRuntimeLeak ||
                                    shouldExcludeDependency(
                                        groupId = group,
                                        artifactId = module,
                                    )

                            if (shouldBeExcluded) {
                                Logging.log(
                                    "Removing excluded dependency from Gradle module JSON: $group:$module",
                                )
                            }

                            shouldBeExcluded
                        }

                        writer().use {
                            it.write(
                                JsonOutput.prettyPrint(
                                    JsonOutput.toJson(
                                        json,
                                    ),
                                ),
                            )
                        }
                    }
                }
            }
        }

        brownfieldAppProject.tasks.withType(GenerateModuleMetadata::class.java)
            .configureEach {
                it.finalizedBy(removeDependenciesFromModuleFileTask.get())
            }
    }

    /**
     * Modifies the generated Maven POM file to inject Expo transitive dependencies.
     * @param discoveredExpoTransitiveDependencies Set of DependencyInfo
     * representing Expo transitive dependencies to add.
     */
    @Suppress("LongMethod")
    protected fun reconfigurePOM(discoveredExpoTransitiveDependencies: VersionMediatingDependencySet) {
        val declaredDependencies = declaredBrownfieldDependencies()
        brownfieldAppProject.pluginManager.withPlugin("maven-publish") {
            brownfieldAppProject.extensions.configure(PublishingExtension::class.java) { publishing ->
                publishing.publications.withType(MavenPublication::class.java)
                    .configureEach { pub ->
                        Logging.log(
                            "Configuring POM for publication '${pub.name}' to include Expo transitive dependencies",
                        )

                        pub.pom.withXml {
                            val root = it.asNode()

                            // below: obtains a view of the <dependencies> node(s)
                            // inside the POM XML; in practice, there should be only one such node
                            val dependenciesNodeList =
                                root.get("dependencies") as NodeList
                            val dependenciesNode =
                                dependenciesNodeList.first() as groovy.util.Node
                            val existingDependencies = existingPomDependencies(dependenciesNode)

                            // below: inject the discovered Expo transitive dependencies
                            // into the POM's <dependencies> node
                            discoveredExpoTransitiveDependencies.forEach { dependencyToAdd ->
                                if (!shouldPublishDependency(dependencyToAdd, "POM")) {
                                    return@forEach
                                }

                                if ((dependencyToAdd.groupId to dependencyToAdd.artifactId) in declaredDependencies) {
                                    Logging.log(
                                        "Skipping brownfield-declared dependency in POM: ${dependencyToAdd.groupId}:" +
                                            "${dependencyToAdd.artifactId}",
                                    )
                                    return@forEach
                                }

                                if ((dependencyToAdd.groupId to dependencyToAdd.artifactId) in existingDependencies) {
                                    Logging.log(
                                        "Skipping duplicate dependency in POM: ${dependencyToAdd.groupId}:" +
                                            "${dependencyToAdd.artifactId}",
                                    )
                                    return@forEach
                                }

                                Logging.log(
                                    "Injecting dependency to POM: ${dependencyToAdd.groupId}:" +
                                        "${dependencyToAdd.artifactId}:${dependencyToAdd.version}",
                                )

                                val childTags =
                                    mutableMapOf(
                                        "groupId" to dependencyToAdd.groupId,
                                        "artifactId" to dependencyToAdd.artifactId,
                                        "scope" to dependencyToAdd.scope,
                                        "optional" to dependencyToAdd.optional.toString(),
                                    )

                                normalizedDependencyVersion(dependencyToAdd.version)?.let { version ->
                                    childTags["version"] = version
                                }

                                dependenciesNode.appendNode("dependency").let { newDepNode ->
                                    childTags.forEach { (tagName, tagValue) ->
                                        newDepNode.appendNode(tagName, tagValue)
                                    }
                                }
                            }

                            // below: filter out dependencies that should be excluded
                            dependenciesNode.children()
                                .filterIsInstance<groovy.util.Node>()
                                .filter { dependency ->
                                    val groupId =
                                        (dependency["groupId"] as NodeList).text()
                                    val artifactId =
                                        (dependency["artifactId"] as NodeList).text()

                                    val shouldBeExcluded =
                                        shouldExcludeDependency(
                                            groupId = groupId,
                                            artifactId = artifactId,
                                        )

                                    if (shouldBeExcluded) {
                                        Logging.log(
                                            "Removing excluded dependency from POM: $groupId:$artifactId",
                                        )
                                    }

                                    shouldBeExcluded
                                }
                                .forEach { dependency ->
                                    dependenciesNode.remove(dependency)
                                }
                        }
                    }
            }
        }
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
        listOf("implementation", "api", "runtime").forEach {
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
