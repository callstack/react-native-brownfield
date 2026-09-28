package com.callstack.react.brownfield.shared

import org.gradle.api.Project
import org.gradle.api.internal.artifacts.dependencies.DefaultProjectDependency

/**
 * Configurations inspected when discovering a project's direct external dependencies.
 *
 * Not flavor-aware — `releaseImplementation` and friends are missed. Fine for Expo packages, which
 * don't use them; extend if an RNC-CLI native module turns out to.
 */
val TRANSITIVE_DEPENDENCY_CONFIG_NAMES = listOf("implementation", "api", "runtimeOnly")

/** Maven scope per configuration; `runtimeOnly` maps to `runtime` to keep it off the compile classpath. */
private val CONFIG_NAME_TO_SCOPE =
    mapOf(
        "implementation" to "compile",
        "api" to "compile",
        "runtimeOnly" to "runtime",
    )

/**
 * [project]'s direct external (non-project) dependencies on [TRANSITIVE_DEPENDENCY_CONFIG_NAMES],
 * minus anything [isPublishableCoordinate] rejects. Shared by the Expo fallback and RNC paths so
 * both get the same guarantees.
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
