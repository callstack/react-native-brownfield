package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import org.gradle.api.Project
import java.io.File

object MergeProcessor {
    fun mergeClassesJarFilesIntoClasses(
        project: Project,
        classJarFiles: Collection<File>,
        folderOut: File,
    ) {
        classJarFiles.filter { it.exists() }.forEach { jarFile ->
            project.copy {
                it.from(project.zipTree(jarFile))
                it.into(folderOut)
            }
        }
    }

    fun mergeClassesJarIntoClasses(
        project: Project,
        androidLibraries: Collection<AndroidArchiveLibrary>,
        folderOut: File,
    ) {
        val classesJarFiles = getFilteredAarLibs(androidLibraries).map { it.getClassesJarFile() }
        mergeClassesJarFilesIntoClasses(project, classesJarFiles, folderOut)
    }

    private fun getFilteredAarLibs(androidLibraries: Collection<AndroidArchiveLibrary>): Collection<AndroidArchiveLibrary> {
        return androidLibraries.filter { it.getExplodedAarRootDir().exists() }
    }
}
