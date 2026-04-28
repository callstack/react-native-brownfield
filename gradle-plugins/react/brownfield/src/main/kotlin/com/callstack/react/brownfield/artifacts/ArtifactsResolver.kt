package com.callstack.react.brownfield.artifacts

import com.callstack.react.brownfield.expo.ExpoPublishingHelper
import com.callstack.react.brownfield.expo.utils.ExpoGradleProjectProjection
import com.callstack.react.brownfield.plugin.ProjectConfigurations.Companion.CONFIG_NAME
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.GradleProps
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import org.gradle.api.internal.artifacts.dependencies.DefaultProjectDependency
import java.io.File
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

    private fun embedExpoDependencies(): List<UnresolvedArtifactInfo> {
        /**
         * expo project does not exist in example-android-library so doing an
         * early exit.
         */
        if (Utils.isExampleLibrary(baseProject.project.name)) {
            return listOf()
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
        val unresolvedArtifactInfo = mutableListOf<UnresolvedArtifactInfo>()

        val expoPublishingHelper =
            ExpoPublishingHelper(
                brownfieldAppProject = baseProject.project,
            )

        val expoPublishedProjects = mutableMapOf<String, ExpoGradleProjectProjection>()
        val expoProjects = expoPublishingHelper.getDiscoverableExpoProjects()
        expoProjects.filter { it.usePublication }.forEach {
            val artifactId = it.publication?.artifactId
            if (artifactId != null) {
                expoPublishedProjects[artifactId] = it
            }
        }

        expoConfig?.dependencies?.forEach {
            if (extension.resolveLocalDependencies) {
                if (it is DefaultProjectDependency) {
                    val projectDependency =
                        expoProject.dependencies.project(mapOf("path" to ":${it.name}"))
                    baseProject.project.dependencies.add(
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
                            isExpoPublishDependency = false,
                        ),
                    )
                } else {
                    baseProject.project.dependencies.add(
                        CONFIG_NAME,
                        it,
                    )

                    val projectDependency = expoPublishedProjects[it.name]
                    val projectDir = File(projectDependency?.sourceDir)
                    val expoPkgLocalMavenRepo = projectDir.parentFile.resolve("local-maven-repo")
                    val publication = projectDependency?.publication
                    val artifactFile =
                        expoPkgLocalMavenRepo
                            .resolve(
                                "${
                                    publication?.groupId?.replace(
                                        '.',
                                        '/',
                                    )
                                }/${publication?.artifactId}/${publication?.version}/" +
                                    "${publication?.artifactId}-${publication?.version}.aar",
                            )

                    unresolvedArtifactInfo.add(
                        UnresolvedArtifactInfo(
                            it.name.toString(),
                            projectDependency?.name ?: it.name,
                            it.version.toString(),
                            artifactFile.absolutePath,
                            null,
                            null,
                            isExpoPublishDependency = true,
                        ),
                    )
                }
            }
        }

        return unresolvedArtifactInfo
    }

    private fun embedDefaultDependencies(configName: String): List<UnresolvedArtifactInfo> {
        var unresolvedArtifactInfo = mutableListOf<UnresolvedArtifactInfo>()
        if (this.hasExpo) {
            unresolvedArtifactInfo = embedExpoDependencies().toMutableList()
        }

        val project = baseProject.project
        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = project.rootProject.project(projectExt.appProjectName)

        val config = project.rootProject.project(appProject.path).configurations.findByName(configName)
        val defaultDependencies = config?.dependencies?.filterIsInstance<DefaultProjectDependency>()
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
                        isExpoPublishDependency = false,
                    ),
                )
            }
        }

        return unresolvedArtifactInfo
    }
}
