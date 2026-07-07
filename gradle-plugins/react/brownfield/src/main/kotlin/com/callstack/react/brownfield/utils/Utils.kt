package com.callstack.react.brownfield.utils

import com.callstack.react.brownfield.plugin.RNBrownfieldPlugin.Companion.EXPO_PROJECT_LOCATOR
import com.callstack.react.brownfield.processors.VariantHelper
import org.gradle.api.Project
import java.io.File

object Utils {
    fun mergeFiles(
        inputFiles: Collection<File>?,
        output: File,
    ) {
        if (inputFiles.isNullOrEmpty()) return

        val existingFiles = inputFiles.filter { it.exists() }

        if (existingFiles.isEmpty()) return

        if (!output.exists()) {
            output.createNewFile()
        }

        existingFiles.forEach { file ->
            output.appendText("\n${file.readText(Charsets.UTF_8)}\n")
        }
    }

    fun isExpoProject(project: Project): Boolean {
        return project.findProject(EXPO_PROJECT_LOCATOR) != null
    }

    fun hasExpoUpdates(
        project: Project,
        variantName: String,
    ): Boolean {
        return isExpoProject(project) &&
            project.tasks.names.contains(
                VariantHelper.getExpoUpdatesResourcesTaskName(variantName),
            )
    }
}
