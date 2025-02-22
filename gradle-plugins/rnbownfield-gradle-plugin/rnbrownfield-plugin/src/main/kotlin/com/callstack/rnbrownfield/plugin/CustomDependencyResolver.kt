package com.callstack.rnbrownfield.plugin

import org.gradle.api.Project
import org.gradle.api.artifacts.Configuration
import org.gradle.api.artifacts.DependencyResolutionListener
import org.gradle.api.artifacts.ResolvableDependencies
import org.gradle.api.internal.artifacts.dependencies.DefaultProjectDependency

/**
 * The goal of this class is to find the project dependencies
 * either local or remote and link to the Aar for code hints and supports.
 *
 * It does not embed anything to the Aar.
 */
class CustomDependencyResolver(
    private val project: Project,
    private val configuration: Configuration,
) : DependencyResolutionListener {
    private fun getCompileOnlyConfigName(configurationName: String): String {
        val configSuffix = ProjectConfigurations.CONFIG_SUFFIX
        if (configurationName.endsWith(configSuffix)) {
            val configName = configurationName.substring(0, configurationName.length - configSuffix.length)
            return "${configName}CompileOnly"
        } else {
            return "compileOnly"
        }
    }

    override fun beforeResolve(dependencies: ResolvableDependencies) {
        val configName = getCompileOnlyConfigName(configuration.name)
        configuration.dependencies.forEach { dependency ->
            if (dependency is DefaultProjectDependency) {
                // Ensure the target configuration is set to "default" if not already specified
                if (dependency.targetConfiguration == null) {
                    dependency.targetConfiguration = "default"
                }

                // To support module indexing, Create a clone of the dependency without a target configuration
                val dependencyClone = dependency.copy()
                dependencyClone.targetConfiguration = null

                // For code hints support, Add the clone to the compileOnly configuration
                project.dependencies.add(configName, dependencyClone)
            } else {
                // For code hints support, Add non-project dependencies to the compileOnly configuration
                project.dependencies.add(configName, dependency)
            }
        }
    }

    override fun afterResolve(dependencies: ResolvableDependencies) {
        project.gradle.removeListener(this)
    }
}
