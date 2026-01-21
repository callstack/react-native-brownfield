package com.callstack.react.brownfield.shared

import com.android.build.gradle.LibraryExtension
import com.callstack.react.brownfield.processors.VariantHelper
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import org.gradle.api.DefaultTask
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.tasks.InputFile
import org.gradle.api.tasks.TaskAction
import java.io.File

abstract class ExplodeAarTask: DefaultTask() {

    @get:InputFile
    abstract val inputArtifactListFile: RegularFileProperty

    @TaskAction
    fun run() {
        val file = inputArtifactListFile.get().asFile
        val artifacts = readArtifacts(file)

        project.extensions.getByType(LibraryExtension::class.java).libraryVariants.all { variant ->
            val variantHelper = VariantHelper(variant)
            variantHelper.project = project

            // classes-merge
            variantHelper.classesMergeTaskDoFirst(
                DirectoryManager.getMergeClassDirectory(
                    variant
                )
            )

            val aarLibraries = mutableListOf<AndroidArchiveLibrary>()
            artifacts.forEach { art ->
                val archiveLibrary =
                    AndroidArchiveLibrary(
                        this.project,
                        art,
                        variant.name,
                    )

                aarLibraries.add(archiveLibrary)

                // explode-aar
                val zipFolder = archiveLibrary.getExplodedAarRootDir()
                zipFolder.mkdirs()

                project.copy {
                    zipFolder.deleteRecursively()
                    it.from(project.zipTree(art.file))
                    it.into(zipFolder)
                }
            }

            // classes-merge
            variantHelper.classesMergeTaskDoLast(DirectoryManager.getMergeClassDirectory(variant), aarLibraries, mutableListOf())
        }
    }

    private fun readArtifacts(file: File): List<UnresolvedArtifactInfo> {
        if (!file.exists()) return emptyList()

        return file.readLines()
            .filter { it.isNotBlank() }
            .map { JsonInstance.json.decodeFromString<UnresolvedArtifactInfo>(it) }
    }
}