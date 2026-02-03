package com.callstack.react.brownfield.shared

import com.android.build.gradle.LibraryExtension
import com.callstack.react.brownfield.processors.VariantHelper
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import org.gradle.api.DefaultTask
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.InputFile
import org.gradle.api.tasks.TaskAction
import java.io.File

abstract class ExplodeAarTask: DefaultTask() {

    @get:InputFile
    abstract val inputArtifactListFile: RegularFileProperty

    @get:InputFile
    abstract val inputTaskList: RegularFileProperty

    @get:Input
    abstract val variantName: Property<String>

    @get:Input
    abstract val minifyEnabled: Property<Boolean>

    @TaskAction
    fun run() {
        val file = inputArtifactListFile.get().asFile
        val artifacts = readArtifacts(file)
        val resolvedVariantName = variantName.get()

        val variantHelper = VariantHelper()
        variantHelper.project = project

        // classes-merge
        variantHelper.classesMergeTaskDoFirst(
            DirectoryManager.getMergeClassDirectory(
                resolvedVariantName
            ),
            resolvedVariantName
        )

        val aarLibraries = mutableListOf<AndroidArchiveLibrary>()
        val filteredArtifacts = artifacts.filter { it.bundleTaskName?.lowercase()?.contains(resolvedVariantName) == true }
        filteredArtifacts.forEach { art ->
            val archiveLibrary =
                AndroidArchiveLibrary(
                    this.project,
                    art,
                    resolvedVariantName,
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
        val mergeClassesOutputDir = DirectoryManager.getMergeClassDirectory(resolvedVariantName)
        variantHelper.classesMergeTaskDoLast(mergeClassesOutputDir, aarLibraries, mutableListOf(), resolvedVariantName, minifyEnabled.get())
    }

    private fun readArtifacts(file: File): List<UnresolvedArtifactInfo> {
        if (!file.exists()) return emptyList()

        return file.readLines()
            .filter { it.isNotBlank() }
            .map { JsonInstance.json.decodeFromString<UnresolvedArtifactInfo>(it) }
    }
}