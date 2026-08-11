package com.callstack.react.brownfield.expo.utils

import com.android.build.api.dsl.LibraryExtension
import org.gradle.api.Project
import java.io.File

object LocalMavenUtils {
    fun getAarFile(
        localMavenDir: File,
        publication: BrownfieldPublishingInfo,
    ): File {
        return getFile(localMavenDir, publication, "aar")
    }

    fun getPomFile(
        localMavenDir: File,
        publication: BrownfieldPublishingInfo,
    ): File {
        return getFile(localMavenDir, publication, "pom")
    }

    private fun getFile(
        localMavenDir: File,
        publication: BrownfieldPublishingInfo,
        extension: String,
    ): File {
        return localMavenDir
            .resolve(
                "${
                    publication.groupId.replace(
                        '.',
                        '/',
                    )
                }/${publication.artifactId}/${publication.version}/" +
                    "${publication.artifactId}-${publication.version}.$extension",
            )
    }

    fun getPublishingInfo(
        expoGPProjection: ExpoGradleProjectProjection,
        brownfieldAppProject: Project,
    ): BrownfieldPublishingInfo? {
        return expoGPProjection.publication?.let {
            BrownfieldPublishingInfo(
                groupId = it.groupId,
                artifactId = it.artifactId,
                version = it.version,
            )
        } ?: run {
            val targetProject =
                brownfieldAppProject.rootProject.allprojects.firstOrNull {
                    it.projectDir.absoluteFile.path == expoGPProjection.sourceDir
                }

            if (targetProject == null) {
                return null
            }

            val targetProjectAndroidLibExt =
                targetProject.extensions.getByType(LibraryExtension::class.java)

            val packagePieces = targetProjectAndroidLibExt.namespace!!.split(".")
            val artifactId = packagePieces.last()
            // below: remove the trailing artifactId component -> leaves only the groupId components
            val groupId = packagePieces.dropLast(1).joinToString(".")

            (
                BrownfieldPublishingInfo(
                    groupId = groupId,
                    artifactId = artifactId,
                    version = targetProject.version.toString(),
                )
            )
        }
    }

    fun publishingNotFound(projectName: String): String {
        return "Cannot configure publishing for Expo project $projectName - could not determine publishing info"
    }
}
