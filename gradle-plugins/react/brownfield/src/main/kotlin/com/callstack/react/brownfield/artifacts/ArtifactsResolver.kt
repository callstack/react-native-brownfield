package com.callstack.react.brownfield.artifacts

import com.callstack.react.brownfield.plugin.ProjectConfigurations.Companion.CONFIG_NAME
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.GradleProps
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import org.gradle.api.internal.artifacts.dependencies.DefaultProjectDependency
import kotlin.collections.mutableListOf

class ArtifactsResolver(
    private val baseProject: BaseProject,
    private val extension: Extension,
    private val hasExpo: Boolean,
) :
    GradleProps() {
    fun processDefaultDependencies(): List<UnresolvedArtifactInfo> {
        return embedDefaultDependencies("implementation")
    }

    private fun embedExpoDependencies() {
        /**
         * expo project does not exist in example-android-library so doing an
         * early exit.
         */
        if (Utils.isExampleLibrary(baseProject.project.name)) {
            return
        }

        /**
         * The expo third party dependencies are linked to `expo` project.
         * They are linked via `api` configuration and in two ways. In the
         * first way, they are linked as a subProject or local dependencies.
         * In the second way, they are linked as local maven hosted dependencies.
         *
         * We get those dependencies of `expo` project and add those to the consumer
         * library project.
         */
        val expoProject = baseProject.project.rootProject.project("expo")
        val expoConfig = expoProject.configurations.findByName("api")
        expoConfig?.dependencies?.forEach {
            if (extension.resolveLocalDependencies) {
                if (it is DefaultProjectDependency) {
                    val projectDependency =
                        expoProject.dependencies.project(mapOf("path" to ":${it.name}"))
                    baseProject.project.dependencies.add(
                        CONFIG_NAME,
                        projectDependency,
                    )
                } else {
                    baseProject.project.dependencies.add(
                        CONFIG_NAME,
                        it,
                    )
                }
            }
        }
    }

    private fun embedDefaultDependencies(configName: String): List<UnresolvedArtifactInfo> {
        if (this.hasExpo) {
            embedExpoDependencies()
        }

        val project = baseProject.project
        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = project.rootProject.project(projectExt.appProjectName)

        val config = project.rootProject.project(appProject.path).configurations.findByName(configName)
        val defaultDependencies = config?.dependencies?.filterIsInstance<DefaultProjectDependency>()
        val unresolvedArtifactInfo = mutableListOf<UnresolvedArtifactInfo>()
        defaultDependencies?.forEach { dependency ->
            if (extension.resolveLocalDependencies) {
                val projectDependency =
                    project.dependencies.project(mapOf("path" to ":${dependency.name}"))
                project.dependencies.add(
                    CONFIG_NAME,
                    projectDependency,
                )

                unresolvedArtifactInfo.add(
                    UnresolvedArtifactInfo(
                        projectDependency.group.toString(),
                        projectDependency.name,
                        projectDependency.version.toString(),
                        null,
                        null,
                        null,
                    ),
                )
            }
        }

        return unresolvedArtifactInfo
    }
}
