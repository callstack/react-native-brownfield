@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.react.brownfield.processors

import com.android.build.gradle.api.LibraryVariant
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.Utils
import org.gradle.api.Task
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.tasks.TaskProvider
import java.io.File

class ProguardProcessor : BaseProject() {
    fun processConsumerFiles(
        proguardRules: List<File>,
        capitalizedVariantName: String
    ) {
        val mergeTaskName = "merge${capitalizedVariantName}ConsumerProguardFiles"
        val mergeFileTask = project.tasks.named(mergeTaskName)

        if (!mergeFileTask.isPresent) {
            throw TaskNotFound("Task $mergeTaskName not found")
        }

        mergeFileTask.configure { task ->
            task.doLast {
                val outputFile = it.outputs.files.singleFile
                doLast(proguardRules, outputFile)
            }
        }
    }

    fun processGeneratedFiles(
        proguardRules: List<File>,
        capitalizedVariantName: String
    ) {
        val mergeGenerateProguardTask: TaskProvider<*>?
        val mergeName = "merge${capitalizedVariantName}GeneratedProguardFiles"
        mergeGenerateProguardTask = project.tasks.named(mergeName)

        mergeGenerateProguardTask.configure { task ->
            task.doLast {
                val outputFile = it.outputs.files.singleFile
                doLast(proguardRules, outputFile)
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
            Logging.log(e)
        }
    }
}
