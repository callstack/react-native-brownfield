package com.callstack.react.brownfield.artifacts

import com.callstack.react.brownfield.expo.utils.ExpoGradleProjectProjection
import com.callstack.react.brownfield.expo.utils.LocalMavenUtils
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
    companion object {
        const val CONFIG_NAME = "implementation"
    }

    fun processDefaultDependencies(expoProjects: List<ExpoGradleProjectProjection>): List<UnresolvedArtifactInfo> {
        return embedDefaultDependencies(expoProjects)
    }

    private fun embedExpoDependencies(expoProjects: List<ExpoGradleProjectProjection>): List<UnresolvedArtifactInfo> {
        /**
         * expo project does not exist in example-android-library so doing an
         * early exit.
         */
        if (Utils.isExampleLibrary(baseProject.project.name)) {
            return listOf()
        }

        val project = baseProject.project

        /**
         * The expo third party dependencies are linked to `expo` project.
         * They are linked via `api` configuration and in two ways. In the
         * first way, they are linked as a subProject or local dependencies.
         * In the second way, they are linked as local maven hosted dependencies.
         *
         * We get those dependencies of `expo` project and add those to the consumer
         * library project.
         */
        val expoProject = project.rootProject.project("expo")
        val expoConfig = expoProject.configurations.findByName("api")
        val unresolvedArtifactInfo = mutableListOf<UnresolvedArtifactInfo>()

        val expoPublishedProjects = mutableMapOf<String, ExpoGradleProjectProjection>()
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
                            isExpoPublishDependency = false,
                        ),
                    )
                } else {
                    project.dependencies.add(
                        CONFIG_NAME,
                        it,
                    )

                    val projectDependency = expoPublishedProjects[it.name]
                    val sourceDir = projectDependency?.sourceDir ?: return@forEach

                    val projectName = projectDependency.name
                    val projectDir = File(sourceDir)
                    val expoLocalMavenRepo = projectDir.parentFile.resolve("local-maven-repo")
                    val publication =
                        LocalMavenUtils.getPublishingInfo(projectDependency, project)
                            ?: error(LocalMavenUtils.publishingNotFound(projectName))

                    val artifactFile = LocalMavenUtils.getAarFile(expoLocalMavenRepo, publication)

                    unresolvedArtifactInfo.add(
                        UnresolvedArtifactInfo(
                            it.group.toString(),
                            projectName,
                            it.version.toString(),
                            artifactFile.absolutePath,
                            isExpoPublishDependency = true,
                        ),
                    )
                }
            }
        }

        return unresolvedArtifactInfo
    }

    private fun embedDefaultDependencies(expoProjects: List<ExpoGradleProjectProjection>): List<UnresolvedArtifactInfo> {
        var unresolvedArtifactInfo = mutableListOf<UnresolvedArtifactInfo>()
        if (this.hasExpo) {
            unresolvedArtifactInfo = embedExpoDependencies(expoProjects).toMutableList()
        }

        val project = baseProject.project
        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = project.rootProject.project(projectExt.appProjectName)

        val config = project.rootProject.project(appProject.path).configurations.findByName(CONFIG_NAME)
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
                        isExpoPublishDependency = false,
                    ),
                )
            }
        }

        return unresolvedArtifactInfo
    }
}
