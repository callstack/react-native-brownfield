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
import org.gradle.api.tasks.Copy
import org.gradle.api.tasks.TaskProvider
import java.io.File

class JNILibsProcessor : BaseProject() {
    fun processJniLibs(
        aarLibraries: Collection<AndroidArchiveLibrary>,
        variant: LibraryVariant,
    ) {
        val capitalizedVariantName = variant.name.replaceFirstChar(Char::titlecase)
        val taskName = "merge${capitalizedVariantName}JniLibFolders"
        val mergeJniLibsTask = project.tasks.named(taskName)

        if (!mergeJniLibsTask.isPresent) {
            throw TaskNotFound("Task $taskName not found")
        }

        val androidExtension = project.extensions.getByName("android") as LibraryExtension
        val copyTask = copySoLibsTask(variant)

        mergeJniLibsTask.configure {
            it.dependsOn(copyTask)

            it.doFirst {
                val existingJNILibs =
                    listOf("arm64-v8a", "armeabi-v7a", "x86_64", "x86")
                        .associateWith { mutableListOf<String>() }
                        .toMutableMap()

                for (archiveLibrary in aarLibraries) {
                    val jniDir = archiveLibrary.getJniDir()
                    processNestedLibs(jniDir.listFiles(), existingJNILibs)
                    if (jniDir.exists()) {
                        val filteredSourceSets = androidExtension.sourceSets.filter { sourceSet -> sourceSet.name == variant.name }
                        filteredSourceSets.forEach { sourceSet -> sourceSet.jniLibs.srcDir(jniDir) }
                    }
                }
            }
        }
    }

    private fun copySoLibsTask(variant: LibraryVariant): TaskProvider<Copy> {
        val variantName = variant.name
        val capitalizedVariant = variantName.replaceFirstChar(Char::titlecase)

        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = project.rootProject.project(projectExt.appProjectName)
        val appBuildDir = appProject.layout.buildDirectory.get()

        val stripTask = ":${appProject.name}:strip${capitalizedVariant}DebugSymbols"
        val codegenTask = ":${project.name}:generateCodegenSchemaFromJavaScript"

        val fromDir =
            appBuildDir
                .dir("intermediates/stripped_native_libs/$variantName/strip${capitalizedVariant}DebugSymbols/out/lib")
                .asFile

        val intoDir =
            project.rootProject
                .file("${project.name}/libs$capitalizedVariant")


        return project.tasks.register("copy${capitalizedVariant}LibSources", Copy::class.java) {
            it.dependsOn(stripTask, codegenTask)
            it.from(fromDir)
            it.into(intoDir)

            it.include("**/libappmodules.so", "**/libreact_codegen_*.so")
            projectExt.dynamicLibs.forEach { lib -> it.include("**/$lib") }
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
}
