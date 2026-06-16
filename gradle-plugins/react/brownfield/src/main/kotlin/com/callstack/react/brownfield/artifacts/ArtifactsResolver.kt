package com.callstack.react.brownfield.artifacts

import com.callstack.react.brownfield.expo.utils.ExpoGradleProjectProjection
import com.callstack.react.brownfield.expo.utils.LocalMavenUtils
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.utils.Extension
import org.gradle.api.Project
import org.gradle.api.internal.artifacts.dependencies.DefaultProjectDependency
import java.io.File
import kotlin.collections.mutableListOf

class ArtifactsResolver(
    private val project: Project,
    private val hasExpo: Boolean,
) {
    companion object {
        const val CONFIG_NAME = "implementation"
    }

    fun processDefaultDependencies(expoProjects: List<ExpoGradleProjectProjection>): List<UnresolvedArtifactInfo> {
        return embedDefaultDependencies(expoProjects)
    }

    private fun embedExpoDependencies(expoProjects: List<ExpoGradleProjectProjection>): List<UnresolvedArtifactInfo> {
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
            if (it is DefaultProjectDependency) {
                addProjectDependencyFromDefault(
                    expoProject,
                    it,
                    unresolvedArtifactInfo,
                )
            } else {
                project.dependencies.add(
                    CONFIG_NAME,
                    it,
                )

                val projectDependency = expoPublishedProjects[it.name]
                val sourceDir = projectDependency?.sourceDir ?: return@forEach
                unresolvedArtifactInfo.add(getExpoUnresolvedArtifactInfo(projectDependency, sourceDir))
            }
        }

        return unresolvedArtifactInfo
    }

    private fun embedDefaultDependencies(expoProjects: List<ExpoGradleProjectProjection>): List<UnresolvedArtifactInfo> {
        val unresolvedArtifactInfo =
            if (hasExpo) embedExpoDependencies(expoProjects).toMutableList() else mutableListOf()

        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = project.rootProject.project(projectExt.appProjectName)

        val config = project.rootProject.project(appProject.path).configurations.findByName(CONFIG_NAME)
        val defaultDependencies = config?.dependencies?.filterIsInstance<DefaultProjectDependency>()
        defaultDependencies?.forEach { dependency ->
            addProjectDependencyFromDefault(
                project,
                dependency,
                unresolvedArtifactInfo,
            )
        }

        return unresolvedArtifactInfo
    }

    /**
     * Resolves a [DefaultProjectDependency] relative to [ownerProject], adds it to this consumer's
     * [CONFIG_NAME], and records a non-publish [UnresolvedArtifactInfo].
     */
    private fun addProjectDependencyFromDefault(
        ownerProject: Project,
        defaultProjectDependency: DefaultProjectDependency,
        unresolvedArtifactInfo: MutableList<UnresolvedArtifactInfo>,
    ) {
        val projectDependency =
            ownerProject.dependencies.project(mapOf("path" to ":${defaultProjectDependency.name}"))
        project.dependencies.add(CONFIG_NAME, projectDependency)
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

    private fun getExpoUnresolvedArtifactInfo(
        projectDependency: ExpoGradleProjectProjection,
        sourceDir: String,
    ): UnresolvedArtifactInfo {
        val projectName = projectDependency.name
        val projectDir = File(sourceDir)
        val expoLocalMavenRepo = projectDir.parentFile.resolve("local-maven-repo")
        val publication =
            LocalMavenUtils.getPublishingInfo(projectDependency, project)
                ?: error(LocalMavenUtils.publishingNotFound(projectName))

        val artifactFile = LocalMavenUtils.getAarFile(expoLocalMavenRepo, publication)

        return UnresolvedArtifactInfo(
            publication.groupId,
            projectName,
            publication.version,
            artifactFile.absolutePath,
            isExpoPublishDependency = true,
        )
    }
}
