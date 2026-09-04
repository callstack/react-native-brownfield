package com.callstack.react.brownfield.artifacts

import com.callstack.react.brownfield.shared.DependencyInfo
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.shared.VersionMediatingDependencySet
import com.callstack.react.brownfield.shared.isPublishableCoordinate
import org.gradle.api.Project
import org.gradle.api.artifacts.Configuration
import org.gradle.api.internal.artifacts.dependencies.DefaultProjectDependency

/**
 * Discovers the real third-party (non-project) dependencies of the native module projects
 * embedded into the fat AAR, for publication into the AAR's own POM/module metadata.
 * Mirrors ExpoPublishingHelper.appendExpoTransitiveDependenciesFromGradle for the RNC-CLI
 * ("vanilla") path — see docs/superpowers/specs/2026-09-04-bgp-transitive-dependencies-design.md §4.2.
 */
class RncTransitiveDependencyDiscoverer(private val project: Project) {
    private val configNames = listOf("implementation", "api", "runtimeOnly")

    fun discover(artifacts: List<UnresolvedArtifactInfo>): VersionMediatingDependencySet {
        val discovered = VersionMediatingDependencySet()

        artifacts
            .filter { it.isExpoPublishDependency != true }
            .forEach { artifact -> discoverFromArtifact(artifact, discovered) }

        return discovered
    }

    private fun discoverFromArtifact(
        artifact: UnresolvedArtifactInfo,
        discovered: VersionMediatingDependencySet,
    ) {
        val moduleProject = project.rootProject.findProject(":${artifact.moduleName}") ?: return
        configNames.forEach { configName ->
            val configuration = moduleProject.configurations.findByName(configName) ?: return@forEach
            collectFromConfiguration(configuration, discovered)
        }
    }

    private fun collectFromConfiguration(
        configuration: Configuration,
        discovered: VersionMediatingDependencySet,
    ) {
        configuration.dependencies.forEach { dependency ->
            if (dependency is DefaultProjectDependency) return@forEach
            val group = dependency.group ?: return@forEach

            val info = DependencyInfo.fromGradleDep(group, dependency.name, dependency.version)
            if (!isPublishableCoordinate(info)) return@forEach
            if (isAlreadyDeclaredByConsumer(group, dependency.name)) return@forEach

            discovered.add(info)
        }
    }

    /**
     * Injection-time dedup only (spec §4.3(B)) — NOT the removal predicate passed to
     * PublishingMetadataInjector. Prevents double-declaring a coordinate the consumer
     * project (e.g. BrownfieldLib) already declares explicitly itself.
     */
    private fun isAlreadyDeclaredByConsumer(
        groupId: String,
        artifactId: String,
    ): Boolean {
        return configNames.any { configName ->
            project.configurations.findByName(configName)?.dependencies?.any {
                it.group == groupId && it.name == artifactId
            } ?: false
        }
    }
}
