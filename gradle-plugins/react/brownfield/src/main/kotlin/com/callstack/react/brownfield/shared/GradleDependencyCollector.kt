package com.callstack.react.brownfield.shared

import org.gradle.api.Project
import org.gradle.api.internal.artifacts.dependencies.DefaultProjectDependency

/**
 * Configuration names inspected when discovering a Gradle project's direct external
 * dependencies for publication into a consumer's POM/Gradle Module Metadata.
 *
 * Not variant/flavor-aware: only these plain configuration names are inspected, not e.g.
 * `releaseImplementation`. Fine for Expo packages (confirmed not to use flavor-specific
 * configurations); an RNC-CLI native module that does use them will have those dependencies
 * missed here. Extend this list if that turns out to matter in practice.
 */
val TRANSITIVE_DEPENDENCY_CONFIG_NAMES = listOf("implementation", "api", "runtimeOnly")

/**
 * Maven POM scope each source configuration maps to. `runtimeOnly` deps are not meant to be
 * on a consumer's compile classpath, so they're published under Maven's `runtime` scope
 * rather than the default `compile` — otherwise a runtime-only dependency of an embedded
 * module would incorrectly become compile-visible to the consuming app.
 */
private val CONFIG_NAME_TO_SCOPE =
    mapOf(
        "implementation" to "compile",
        "api" to "compile",
        "runtimeOnly" to "runtime",
    )

/**
 * Collects [project]'s direct external (non-project) dependencies declared on
 * [TRANSITIVE_DEPENDENCY_CONFIG_NAMES], dropping any coordinate [isPublishableCoordinate]
 * rejects. Shared by the Expo Gradle-fallback and RNC-CLI transitive-dependency discovery
 * paths so both get the same publishability guarantees.
 */
fun collectPublishableGradleDependencies(project: Project): List<DependencyInfo> {
    val result = mutableListOf<DependencyInfo>()

    TRANSITIVE_DEPENDENCY_CONFIG_NAMES.forEach { configName ->
        val configuration = project.configurations.findByName(configName) ?: return@forEach
        val scope = CONFIG_NAME_TO_SCOPE.getValue(configName)

        configuration.dependencies.forEach { dependency ->
            if (dependency is DefaultProjectDependency) return@forEach
            val group = dependency.group ?: return@forEach

            val info = DependencyInfo.fromGradleDep(group, dependency.name, dependency.version, scope)
            if (isPublishableCoordinate(info)) result.add(info)
        }
    }

    return result
}
