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
 * @param supersededCoordinates Coordinates the consumer project (e.g. BrownfieldLib) already
 * declares itself, where at least one embedded module required the same coordinate. The
 * caller must exclude these from the base publication's own pre-existing POM/module.json
 * entries — [dependencies] already carries the correctly mediated (never-lower) version for
 * them, so keeping the old entry around as well would either duplicate it or shadow the
 * mediated version.
 */
data class RncTransitiveDependencyDiscoveryResult(
    val dependencies: VersionMediatingDependencySet,
    val supersededCoordinates: Set<Pair<String, String>>,
)

/**
 * Discovers the real third-party (non-project) dependencies of the native module projects
 * embedded into the fat AAR, for publication into the AAR's own POM/module metadata.
 * Mirrors ExpoPublishingHelper.appendExpoTransitiveDependenciesFromGradle for the RNC-CLI
 * ("vanilla") path.
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
                // Mark superseded whenever the consumer declares this coordinate at all — including
                // when it declares it without a version (BOM/platform). The consumer's pre-existing
                // POM/module.json entry must be *replaced* by the mediated one, never left alongside
                // it, or the same coordinate appears twice in the published metadata.
                supersededCoordinates.add(moduleDependency.groupId to moduleDependency.artifactId)

                // Only let the consumer's own version take part in mediation when it is publishable.
                // A dynamic/range/absent version must never win and end up in published metadata:
                // module-side versions are validated by collectPublishableGradleDependencies, so
                // without this check the consumer side would be the one unguarded hole.
                val consumerVersioned = moduleDependency.copy(version = consumerDeclaration.version)
                if (isPublishableCoordinate(consumerVersioned)) {
                    discovered.add(consumerVersioned)
                }
            }

            discovered.add(moduleDependency)
        }
    }

    /**
     * The consumer's own declaration of this coordinate, or null if it doesn't declare it.
     *
     * Deliberately returns the [Dependency] rather than its version: that is what makes
     * "declared, but without a version" (BOM/`platform()`) distinguishable from "not declared",
     * which in turn decides whether the coordinate needs superseding. Collapsing this to a
     * nullable version string loses that distinction and leaks duplicate POM entries.
     *
     * Note this silently narrows a dynamic consumer declaration. If the consumer declares
     * `androidx.appcompat:appcompat:1.+` and an embedded module declares `1.0.0`, the consumer's
     * `1.+` is excluded from mediation (it is not publishable) but the coordinate is still
     * superseded, so the POM publishes `1.0.0` — possibly lower than what `1.+` would have
     * resolved to at build time. That is intended: a published `<version>1.+</version>` is broken
     * for downstream consumers, so a concrete-but-lower version is the better failure mode.
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
