package com.callstack.react.brownfield.utils

import com.callstack.react.brownfield.plugin.RNBrownfieldPlugin.Companion.EXPO_PROJECT_LOCATOR
import org.gradle.api.Project
import java.io.File

object Utils {
    fun getAGPVersion(): String {
        return try {
            extractAGPVersion("com.android.Version")
        } catch (ignore: Throwable) {
            extractAGPVersion("com.android.builder.model.Version")
        }
    }

    private fun extractAGPVersion(className: String): String {
        val versionField =
            Class.forName(className)
                .getDeclaredField("ANDROID_GRADLE_PLUGIN_VERSION")
        return versionField.get(null) as String
    }

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

    fun getBundledAssetsVariantName(
        variantName: String,
        buildTypeName: String,
        isDebuggable: Boolean,
    ): String {
        if (!isDebuggable) {
            return variantName
        }

        if (variantName == buildTypeName) {
            return "release"
        }

        val capitalizedBuildTypeName = buildTypeName.capitalized()
        return if (variantName.endsWith(capitalizedBuildTypeName)) {
            "${variantName.removeSuffix(capitalizedBuildTypeName)}Release"
        } else {
            "release"
        }
    }
}
