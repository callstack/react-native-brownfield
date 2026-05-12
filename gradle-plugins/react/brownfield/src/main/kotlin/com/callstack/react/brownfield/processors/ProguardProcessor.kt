package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.utils.Utils
import org.gradle.api.Project
import org.gradle.api.file.RegularFileProperty
import java.io.File

class ProguardProcessor(val project: Project) {
    fun processConsumerFiles(
        proguardRules: List<File>,
        capitalizedVariantName: String,
    ) {
        val task = findFirstExistingTask(
            listOf(
                "merge${capitalizedVariantName}ConsumerProguardFiles",
                "merge${capitalizedVariantName}GeneratedProguardFiles",
                "minify${capitalizedVariantName}WithR8",
                "minify${capitalizedVariantName}WithProguard",
            ),
        )

        if (task == null) {
            Logging.log(
                "Brownfield: no consumer proguard merge task found for variant '$capitalizedVariantName'. Skipping consumer proguard merge hook.",
            )
            return
        }

        task.doLast {
            val outputFile = it.outputs.files.singleFile
            doLast(proguardRules, outputFile)
        }
    }

    fun processGeneratedFiles(
        proguardRules: List<File>,
        capitalizedVariantName: String,
    ) {
        val task = findFirstExistingTask(
            listOf(
                "merge${capitalizedVariantName}GeneratedProguardFiles",
                "merge${capitalizedVariantName}ConsumerProguardFiles",
                "minify${capitalizedVariantName}WithR8",
                "minify${capitalizedVariantName}WithProguard",
            ),
        )

        if (task == null) {
            Logging.log(
                "Brownfield: no generated proguard merge task found for variant '$capitalizedVariantName'. Skipping generated proguard merge hook.",
            )
            return
        }

        task.doLast {
            val outputFile = it.outputs.files.singleFile
            doLast(proguardRules, outputFile)
        }
    }

    private fun findFirstExistingTask(candidates: List<String>) =
        candidates
            .asSequence()
            .mapNotNull { taskName -> project.tasks.findByName(taskName) }
            .firstOrNull()

    private fun doLast(
        files: List<File>,
        outputFile: File,
    ) {
        try {
            val outputFileToMerge =
                @Suppress("USELESS_IS_CHECK")
                if (outputFile is File) {
                    outputFile
                } else {
                    (outputFile as? RegularFileProperty)?.get()?.asFile
                        ?: error("Invalid output file")
                }
            Utils.mergeFiles(files, outputFileToMerge)
        } catch (e: NoSuchFileException) {
            Logging.log(e)
        }
    }
}
