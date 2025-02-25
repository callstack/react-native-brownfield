package com.callstack.react.brownfield.plugin

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
                if (dependency.targetConfiguration == null) {
                    dependency.targetConfiguration = "default"
                }

                val dependencyClone = dependency.copy()
                dependencyClone.targetConfiguration = null

                project.dependencies.add(configName, dependencyClone)
            } else {
                project.dependencies.add(configName, dependency)
            }
        }
    }

    override fun afterResolve(dependencies: ResolvableDependencies) {
        project.gradle.removeListener(this)
    }
}
