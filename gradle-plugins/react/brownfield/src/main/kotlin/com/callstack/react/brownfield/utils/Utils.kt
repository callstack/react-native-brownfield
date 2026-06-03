package com.callstack.react.brownfield.utils

import com.callstack.react.brownfield.plugin.RNBrownfieldPlugin.Companion.EXPO_PROJECT_LOCATOR
import org.gradle.api.Project
import org.gradle.api.artifacts.ProjectDependency
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

    fun isExpoProject(project: Project): Boolean {
        return project.findProject(EXPO_PROJECT_LOCATOR) != null
    }

    /**
     * True when the application module declares a project dependency on the
     * brownfield library (e.g. RNApp's `implementation(project(":BrownfieldLib"))`).
     *
     * In that case, wiring copy tasks to the app's `strip*DebugSymbols` tasks creates
     * a circular dependency with the library's JNI merge tasks.
     */
    fun appDependsOnLibrary(
        appProject: Project,
        libraryProject: Project,
    ): Boolean {
        val libraryPath = libraryProject.path
        return appProject.configurations.any { configuration ->
            configuration.dependencies.any { dependency ->
                dependency is ProjectDependency &&
                    resolveProjectDependencyPath(dependency) == libraryPath
            }
        }
    }

    /**
     * Gradle 9 removed [ProjectDependency.getDependencyProject]; use [ProjectDependency.getPath]
     * when available (Gradle 8.11+). Reflection keeps the plugin compatible with the Gradle API
     * version used at compile time.
     */
    private fun resolveProjectDependencyPath(dependency: ProjectDependency): String? {
        try {
            val getPath =
                dependency.javaClass.methods.firstOrNull { method ->
                    method.name == "getPath" && method.parameterCount == 0
                }
            if (getPath != null) {
                return getPath.invoke(dependency) as? String
            }
        } catch (_: ReflectiveOperationException) {
            // fall through to legacy API
        }

        return try {
            val getDependencyProject = dependency.javaClass.getMethod("getDependencyProject")
            val targetProject = getDependencyProject.invoke(dependency) as? Project
            targetProject?.path
        } catch (_: ReflectiveOperationException) {
            null
        }
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
