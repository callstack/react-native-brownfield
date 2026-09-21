package com.callstack.react.brownfield.artifacts

import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.shared.TRANSITIVE_DEPENDENCY_CONFIG_NAMES
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.shared.VersionMediatingDependencySet
import com.callstack.react.brownfield.shared.collectPublishableGradleDependencies
import com.callstack.react.brownfield.shared.isPublishableCoordinate
import org.gradle.api.Project
import org.gradle.api.artifacts.Dependency

/**
 * Result of [RncTransitiveDependencyDiscoverer.discover].
 *
 * @param dependencies The mediated set of third-party dependencies to inject.
 * @param supersededCoordinates Coordinates the consumer declares itself that an embedded module
 * also needs. The caller must drop their pre-existing POM/module.json entries: [dependencies]
 * already carries the mediated (never-lower) version, so keeping both duplicates or shadows it.
 */
data class RncTransitiveDependencyDiscoveryResult(
    val dependencies: VersionMediatingDependencySet,
    val supersededCoordinates: Set<Pair<String, String>>,
)

/**
 * Discovers third-party dependencies of the native modules embedded into the fat AAR, for
 * publication into its POM/module metadata. The RNC-CLI counterpart to
 * `ExpoPublishingHelper.appendExpoTransitiveDependenciesFromGradle`.
 */
class RncTransitiveDependencyDiscoverer(private val project: Project) {
    fun discover(artifacts: List<UnresolvedArtifactInfo>): RncTransitiveDependencyDiscoveryResult {
        val discovered = VersionMediatingDependencySet()
        val supersededCoordinates = mutableSetOf<Pair<String, String>>()

        artifacts
            .filter { it.isExpoPublishDependency != true }
            .forEach { artifact -> discoverFromArtifact(artifact, discovered, supersededCoordinates) }

        return RncTransitiveDependencyDiscoveryResult(discovered, supersededCoordinates)
    }

    private fun discoverFromArtifact(
        artifact: UnresolvedArtifactInfo,
        discovered: VersionMediatingDependencySet,
        supersededCoordinates: MutableSet<Pair<String, String>>,
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

        collectPublishableGradleDependencies(moduleProject).forEach { moduleDependency ->
            val consumerDeclaration = consumerDeclaredDependency(moduleDependency.groupId, moduleDependency.artifactId)

            if (consumerDeclaration != null) {
                // Supersede on the declaration existing, not on it having a version: a versionless
                // one (BOM/platform) still leaves a stale entry that must be replaced, not doubled.
                supersededCoordinates.add(moduleDependency.groupId to moduleDependency.artifactId)

                // Module-side versions are already validated upstream; this is the consumer-side
                // equivalent, keeping a dynamic version from winning mediation and being published.
                val consumerVersioned = moduleDependency.copy(version = consumerDeclaration.version)
                if (isPublishableCoordinate(consumerVersioned)) {
                    discovered.add(consumerVersioned)
                }
            }

            discovered.add(moduleDependency)
        }
    }

    /**
     * The consumer's own declaration of this coordinate, or null if it doesn't declare it. Returns
     * the [Dependency], not its version, so "declared without a version" stays distinguishable from
     * "not declared" — collapsing the two leaks duplicate POM entries.
     *
     * Note this narrows a dynamic declaration: consumer `appcompat:1.+` against module `1.0.0`
     * publishes `1.0.0`, possibly lower than `1.+` would have resolved to. Intended — a published
     * `1.+` is broken for downstream consumers.
     */
    private fun consumerDeclaredDependency(
        groupId: String,
        artifactId: String,
    ): Dependency? {
        return TRANSITIVE_DEPENDENCY_CONFIG_NAMES.firstNotNullOfOrNull { configName ->
            project.configurations.findByName(configName)?.dependencies?.firstOrNull {
                it.group == groupId && it.name == artifactId
            }
        }
    }
}
