package com.callstack.react.brownfield.artifacts

import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.shared.TRANSITIVE_DEPENDENCY_CONFIG_NAMES
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.shared.VersionMediatingDependencySet
import com.callstack.react.brownfield.shared.collectPublishableGradleDependencies
import org.gradle.api.Project

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
            val consumerVersion = consumerDeclaredVersion(moduleDependency.groupId, moduleDependency.artifactId)
            if (consumerVersion != null) {
                // The consumer already declares this coordinate itself. Seed the mediation with
                // that declaration too, so the higher of {consumer's own version, this module's
                // requirement} wins — never lower than what was already there — and mark it so
                // the caller replaces the consumer's pre-existing entry with the mediated one,
                // instead of ending up with a stale duplicate.
                discovered.add(moduleDependency.copy(version = consumerVersion))
                supersededCoordinates.add(moduleDependency.groupId to moduleDependency.artifactId)
            }
            discovered.add(moduleDependency)
        }
    }

    private fun consumerDeclaredVersion(
        groupId: String,
        artifactId: String,
    ): String? {
        return TRANSITIVE_DEPENDENCY_CONFIG_NAMES.firstNotNullOfOrNull { configName ->
            project.configurations.findByName(configName)?.dependencies?.firstOrNull {
                it.group == groupId && it.name == artifactId
            }?.version
        }
    }
}
