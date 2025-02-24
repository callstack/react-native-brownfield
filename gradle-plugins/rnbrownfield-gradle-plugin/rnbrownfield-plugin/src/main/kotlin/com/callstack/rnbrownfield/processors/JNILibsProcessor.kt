@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.rnbrownfield.processors

import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.api.LibraryVariant
import com.callstack.rnbrownfield.exceptions.TaskNotFound
import com.callstack.rnbrownfield.shared.BaseProject
import com.callstack.rnbrownfield.shared.Logging
import com.callstack.rnbrownfield.utils.AndroidArchiveLibrary
import org.gradle.api.Task
import java.io.File

class JNILibsProcessor : BaseProject() {
    fun processJniLibs(
        aarLibraries: Collection<AndroidArchiveLibrary>,
        explodeTasks: MutableList<Task>,
        variant: LibraryVariant,
    ) {
        val upperCaseVariantName = variant.name.replaceFirstChar(Char::titlecase)
        val taskName = "merge${upperCaseVariantName}JniLibFolders"
        val mergeJniLibsTask = project.tasks.named(taskName)

        if (!mergeJniLibsTask.isPresent) {
            throw TaskNotFound("Task $taskName not found")
        }

        val androidExtension = project.extensions.getByName("android") as LibraryExtension
        mergeJniLibsTask.configure {
            it.dependsOn(explodeTasks)

            it.doFirst {
                for (archiveLibrary in aarLibraries) {
                    val jniDir = archiveLibrary.getJniDir()
                    processNestedLibs(jniDir.listFiles())
                    if (jniDir.exists()) {
                        val filteredSourceSets = androidExtension.sourceSets.filter { sourceSet -> sourceSet.name == variant.name }
                        filteredSourceSets.forEach { sourceSet -> sourceSet.jniLibs.srcDir(jniDir) }
                    }
                }
            }
        }
    }

    private fun processNestedLibs(files: Array<File>?) {
        val existingJNILibs =
            listOf("arm64-v8a", "armeabi-v7a", "x86_64", "x86")
                .associateWith { mutableListOf<String>() }
                .toMutableMap()

        files?.forEach { folder ->
            folder.listFiles()?.forEach { file ->
                if (existingJNILibs[folder.name]?.contains(file.name) == true) {
                    val deleted = file.delete()
                    if (!deleted) {
                        Logging.log("Failed to delete: ${file.name}")
                    }
                } else {
                    existingJNILibs[folder.name]?.add(file.name)
                }
            }
        }
    }
}
