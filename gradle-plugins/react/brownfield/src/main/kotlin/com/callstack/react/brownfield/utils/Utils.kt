package com.callstack.react.brownfield.utils

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

    fun isExampleLibrary(projectName: String): Boolean {
        return projectName == "example-android-library"
    }
}
