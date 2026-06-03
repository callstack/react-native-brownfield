@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.react.brownfield.processors

import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.api.LibraryVariant
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.file.Directory
import org.gradle.api.tasks.Copy
import org.gradle.api.tasks.TaskProvider
import java.io.File

class JNILibsProcessor : BaseProject() {
    fun processJniLibs(
        aarLibraries: Collection<AndroidArchiveLibrary>,
        explodeTasks: MutableList<Task>,
        variant: LibraryVariant,
    ) {
        val capitalizedVariantName = variant.name.capitalized()
        val taskName = "merge${capitalizedVariantName}JniLibFolders"
        val mergeJniLibsTask = project.tasks.named(taskName)

        if (!mergeJniLibsTask.isPresent) {
            throw TaskNotFound("Task $taskName not found")
        }

        val projectExt = project.extensions.getByType(Extension::class.java)
        val androidExtension = project.extensions.getByName("android") as LibraryExtension
        val copyTask =
            if (projectExt.useStrippedSoFiles) {
                copySoLibsTask(variant)
            } else {
                null
            }

        mergeJniLibsTask.configure {
            it.dependsOn(explodeTasks)
            copyTask?.let { task -> it.dependsOn(task) }

            it.doFirst {
                val existingJNILibs =
                    listOf("arm64-v8a", "armeabi-v7a", "x86_64", "x86")
                        .associateWith { mutableListOf<String>() }
                        .toMutableMap()
                for (archiveLibrary in aarLibraries) {
                    val jniDir = archiveLibrary.getJniDir()
                    processNestedLibs(jniDir.listFiles(), existingJNILibs)
                    if (!projectExt.useStrippedSoFiles) {
                        if (jniDir.exists()) {
                            val filteredSourceSets =
                                androidExtension.sourceSets.filter { sourceSet -> sourceSet.name == variant.name }
                            filteredSourceSets.forEach { sourceSet ->
                                sourceSet.jniLibs.srcDir(
                                    jniDir,
                                )
                            }
                        }
                    }
                }
                if (projectExt.useStrippedSoFiles) {
                    copyStrippedSoLibs(variant, existingJNILibs)
                }
            }
        }
    }

    private fun getAppProject(): Project {
        val projectExt = project.extensions.getByType(Extension::class.java)
        return project.rootProject.project(projectExt.appProjectName)
    }

    private fun appDependsOnLibrary(): Boolean = Utils.appDependsOnLibrary(getAppProject(), project)

    private fun getCxxBuildType(variant: LibraryVariant): String =
        if (variant.buildType.isDebuggable) {
            "Debug"
        } else {
            "RelWithDebInfo"
        }

    private fun getStrippedLibsPath(variant: LibraryVariant): Pair<File, File> {
        val appProject = getAppProject()
        val appBuildDir = appProject.layout.buildDirectory.get()

        val variantName = variant.name
        val capitalizedVariant = variantName.capitalized()

        val fromDir =
            if (appDependsOnLibrary()) {
                getAppCxxLibsDir(appBuildDir, variant)
            } else {
                appBuildDir
                    .dir(
                        "intermediates/stripped_native_libs/$variantName/strip${capitalizedVariant}DebugSymbols/out/lib",
                    ).asFile
            }

        val intoDir = project.rootProject.file("${project.name}/libs$capitalizedVariant")

        return Pair(fromDir, intoDir)
    }

    private fun getAppCxxLibsDir(
        appBuildDir: Directory,
        variant: LibraryVariant,
    ): File = appBuildDir.dir("intermediates/cxx/${getCxxBuildType(variant)}").asFile

    private fun copySoLibsTask(variant: LibraryVariant): TaskProvider<Copy> {
        val capitalizedVariant = variant.name.capitalized()
        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = getAppProject()
        val appDependsOnLibrary = appDependsOnLibrary()

        val codegenTask = ":${project.name}:generateCodegenSchemaFromJavaScript"
        val (fromDir, intoDir) = getStrippedLibsPath(variant)

        return project.tasks.register("copy${capitalizedVariant}LibSources", Copy::class.java) {
            if (appDependsOnLibrary) {
                val cxxBuildType = getCxxBuildType(variant)
                it.dependsOn(
                    ":${appProject.name}:buildCMake$cxxBuildType",
                    ":${appProject.name}:generateCodegenArtifactsFromSchema",
                    codegenTask,
                )
                it.from(fromDir)
                it.include("**/libappmodules.so", "**/libreact_codegen_*.so")
                projectExt.dynamicLibs.forEach { lib -> it.include("**/$lib") }
                it.eachFile { details ->
                    val pathSegments = details.relativePath.segments
                    val arch =
                        pathSegments.firstOrNull { segment ->
                            segment in SUPPORTED_ABIS
                        }
                    if (arch != null) {
                        details.path = "$arch/${pathSegments.last()}"
                    }
                }
            } else {
                val stripTask = ":${appProject.name}:strip${capitalizedVariant}DebugSymbols"
                it.dependsOn(stripTask, codegenTask)
                it.from(fromDir)
                it.include("**/libappmodules.so", "**/libreact_codegen_*.so")
                projectExt.dynamicLibs.forEach { lib -> it.include("**/$lib") }
            }
            it.into(intoDir)
        }
    }

    private fun copyStrippedSoLibs(
        variant: LibraryVariant,
        existingJNILibs: MutableMap<String, MutableList<String>>,
    ) {
        val (fromDir, intoDir) = getStrippedLibsPath(variant)

        existingJNILibs.forEach { (arch, libNames) ->
            if (appDependsOnLibrary()) {
                copyLibsForArchitectureFromCxx(fromDir, intoDir, arch, libNames)
            } else {
                copyLibsForArchitecture(fromDir, intoDir, arch, libNames)
            }
        }
    }

    private fun copyLibsForArchitectureFromCxx(
        cxxRoot: File,
        intoDir: File,
        arch: String,
        libNames: List<String>,
    ) {
        if (!cxxRoot.exists()) return

        val destArchDir = File(intoDir, arch).apply { mkdirs() }

        libNames.forEach { libName ->
            val sourceFile =
                cxxRoot
                    .walkTopDown()
                    .firstOrNull { file ->
                        file.isFile &&
                            file.name == libName &&
                            file.parentFile?.name == arch &&
                            file.path.contains("${File.separator}obj${File.separator}")
                    }
            if (sourceFile != null) {
                copyLibFile(sourceFile.parentFile!!, destArchDir, libName)
            }
        }
    }

    private fun copyLibsForArchitecture(
        fromDir: File,
        intoDir: File,
        arch: String,
        libNames: List<String>,
    ) {
        val sourceArchDir = File(fromDir, arch)
        if (!sourceArchDir.exists()) return

        val destArchDir = File(intoDir, arch).apply { mkdirs() }

        libNames.forEach { libName ->
            copyLibFile(sourceArchDir, destArchDir, libName)
        }
    }

    private fun copyLibFile(
        sourceArchDir: File,
        destArchDir: File,
        libName: String,
    ) {
        val sourceFile = File(sourceArchDir, libName)
        val destFile = File(destArchDir, libName)

        if (sourceFile.exists()) {
            try {
                sourceFile.copyTo(destFile, overwrite = true)
            } catch (e: java.io.IOException) {
                Logging.log("Failed to copy $libName: ${e.message}")
            }
        }
    }

    private fun processNestedLibs(
        files: Array<File>?,
        existingJNILibs: MutableMap<String, MutableList<String>>,
    ) {
        files?.forEach { folder ->
            val libFiles = folder.listFiles() ?: return@forEach
            val libList = existingJNILibs[folder.name] ?: return@forEach

            libFiles.forEach { file ->
                if (file.name in libList) {
                    deleteFile(file)
                } else {
                    libList.add(file.name)
                }
            }
        }
    }

    private fun deleteFile(file: File) {
        if (!file.delete()) {
            Logging.log("Failed to delete: ${file.name}")
        }
    }

    companion object {
        private val SUPPORTED_ABIS = setOf("arm64-v8a", "armeabi-v7a", "x86_64", "x86")
    }
}
