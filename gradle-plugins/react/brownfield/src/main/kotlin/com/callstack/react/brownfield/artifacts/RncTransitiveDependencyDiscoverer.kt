package com.callstack.react.brownfield.artifacts

import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.shared.TRANSITIVE_DEPENDENCY_CONFIG_NAMES
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.shared.VersionMediatingDependencySet
import com.callstack.react.brownfield.shared.collectPublishableGradleDependencies
import org.gradle.api.Project

/**
 * Discovers the real third-party (non-project) dependencies of the native module projects
 * embedded into the fat AAR, for publication into the AAR's own POM/module metadata.
 * Mirrors ExpoPublishingHelper.appendExpoTransitiveDependenciesFromGradle for the RNC-CLI
 * ("vanilla") path.
 */
class RncTransitiveDependencyDiscoverer(private val project: Project) {
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
        val moduleProject = project.rootProject.findProject(":${artifact.moduleName}")
        if (moduleProject == null) {
            Logging.log(
                "WARNING: Could not discover transitive dependencies for embedded module " +
                    "'${artifact.moduleName}' - no Gradle project found at " +
                    "':${artifact.moduleName}' in the root project",
            )
            return
        }

        collectPublishableGradleDependencies(moduleProject)
            .filterNot { isAlreadyDeclaredByConsumer(it.groupId, it.artifactId) }
            .forEach { discovered.add(it) }
    }

    /**
     * Injection-time dedup only — NOT the removal predicate passed to
     * PublishingMetadataInjector. Prevents double-declaring a coordinate the consumer
     * project (e.g. BrownfieldLib) already declares explicitly itself.
     */
    private fun isAlreadyDeclaredByConsumer(
        groupId: String,
        artifactId: String,
    ): Boolean {
        return TRANSITIVE_DEPENDENCY_CONFIG_NAMES.any { configName ->
            project.configurations.findByName(configName)?.dependencies?.any {
                it.group == groupId && it.name == artifactId
            } ?: false
        }
    }
}
