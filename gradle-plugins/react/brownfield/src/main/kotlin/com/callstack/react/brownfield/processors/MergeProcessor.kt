package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import org.gradle.api.Project
import java.io.File

object MergeProcessor {
    fun mergeClassesJarIntoClasses(
        project: Project,
        androidLibraries: Collection<AndroidArchiveLibrary>,
        folderOut: File,
    ) {
        val allJarFiles: MutableCollection<File> = ArrayList()
        val filteredLibs = getFilteredAarLibs(androidLibraries)
        filteredLibs.forEach {
            allJarFiles.add(it.getClassesJarFile())
        }

        val filteredAllJarFiles = allJarFiles.filter { it.exists() }
        filteredAllJarFiles.forEach { jarFile ->
            project.copy {
                it.from(project.zipTree(jarFile))
                it.into(folderOut)
            }
        }
    }

    fun mergeLibsIntoClasses(
        project: Project,
        androidLibraries: Collection<AndroidArchiveLibrary>,
        jarFiles: Collection<File>,
        outputDir: File,
    ) {
        val allJarFiles: MutableCollection<File> = ArrayList()
        val filteredLibs = getFilteredAarLibs(androidLibraries)
        filteredLibs.forEach {
            allJarFiles.addAll(it.getLocalJars())
        }

        val filteredJarFiles = jarFiles.filter { it.exists() }
        filteredJarFiles.forEach { allJarFiles.add(it) }

        allJarFiles.forEach { jarFile ->
            project.copy {
                it.from(project.zipTree(jarFile))
                it.into(outputDir)
                it.exclude("META-INF/")
            }
        }
    }

    private fun getFilteredAarLibs(androidLibraries: Collection<AndroidArchiveLibrary>): Collection<AndroidArchiveLibrary> {
        return androidLibraries.filter { it.getExplodedAarRootDir().exists() }
    }

    fun mergeLibsIntoLibs(
        project: Project,
        androidLibraries: Collection<AndroidArchiveLibrary>,
        jarFiles: Collection<File>,
        folderOut: File,
    ) {
        val filteredLibs = getFilteredAarLibs(androidLibraries)
        filteredLibs.forEach { aarLib ->
            if (!aarLib.getLocalJars().isEmpty()) {
                project.copy {
                    it.from(aarLib.getLocalJars())
                    it.into(folderOut)
                }
            }
        }

        val filteredJarFiles = jarFiles.filter { it.exists() }
        filteredJarFiles.forEach { jarFile ->
            project.copy {
                it.from(jarFile)
                it.into(folderOut)
            }
        }
    }
}
