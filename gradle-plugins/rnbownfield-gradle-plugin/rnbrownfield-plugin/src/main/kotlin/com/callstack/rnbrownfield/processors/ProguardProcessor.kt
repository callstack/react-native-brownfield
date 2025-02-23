@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.rnbrownfield.processors

import com.android.build.gradle.api.LibraryVariant
import com.callstack.rnbrownfield.exceptions.TaskNotFound
import com.callstack.rnbrownfield.shared.BaseProject
import com.callstack.rnbrownfield.shared.Logging
import com.callstack.rnbrownfield.utils.AndroidArchiveLibrary
import com.callstack.rnbrownfield.utils.Utils
import org.gradle.api.Task
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.tasks.TaskProvider
import java.io.File

class ProguardProcessor(variant: LibraryVariant) : BaseProject() {
    private val upperCaseVariantName = variant.name.replaceFirstChar(Char::titlecase)

    fun processConsumerFiles(
        aarLibs: Collection<AndroidArchiveLibrary>,
        explodeTasks: MutableList<Task>,
    ) {
        val mergeTaskName = "merge${upperCaseVariantName}ConsumerProguardFiles"
        val mergeFileTask = project.tasks.named(mergeTaskName)

        if (!mergeFileTask.isPresent) {
            throw TaskNotFound("Task $mergeTaskName not found")
        }

        mergeFileTask.configure { task ->
            task.dependsOn(explodeTasks)
            task.doLast {
                val files = aarLibs.map { aarLib -> aarLib.getProguardRules() }
                val outputFile = it.outputs.files.singleFile
                doLast(files, outputFile)
            }
        }
    }

    fun processGeneratedFiles(
        aarLibs: Collection<AndroidArchiveLibrary>,
        explodeTasks: MutableList<Task>,
    ) {
        val mergeGenerateProguardTask: TaskProvider<*>?
        val mergeName = "merge${upperCaseVariantName}GeneratedProguardFiles"
        mergeGenerateProguardTask = project.tasks.named(mergeName)

        mergeGenerateProguardTask?.configure { task ->
            task.dependsOn(explodeTasks)
            task.doLast {
                val files = aarLibs.map { it.getProguardRules() }
                val outputFile = it.outputs.files.singleFile
                doLast(files, outputFile)
            }
        }
    }

    private fun doLast(
        files: List<File>,
        outputFile: File,
    ) {
        try {
            val outputFileToMerge =
                if (outputFile is File) {
                    outputFile
                } else {
                    (outputFile as? RegularFileProperty)?.get()?.asFile ?: error("Invalid output file")
                }
            Utils.mergeFiles(files, outputFileToMerge)
        } catch (e: NoSuchFileException) {
            Logging.log(e.printStackTrace())
        }
    }
}
