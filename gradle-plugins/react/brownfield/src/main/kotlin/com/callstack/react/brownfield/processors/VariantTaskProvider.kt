package com.callstack.react.brownfield.processors

import com.android.build.gradle.api.LibraryVariant
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.UnknownTaskException
import org.gradle.api.tasks.TaskProvider
import java.io.File

class VariantTaskProvider: BaseProject() {
    fun bundleTaskProvider(
        project: Project,
        variantName: String,
    ): TaskProvider<Task> {
        var bundleTaskPath = "bundle${variantName.replaceFirstChar(Char::titlecase)}"
        return try {
            project.tasks.named(bundleTaskPath)
        } catch (_: UnknownTaskException) {
            bundleTaskPath += "Aar"
            project.tasks.named(bundleTaskPath)
        }
    }

    fun processDataBinding(
        bundleTask: TaskProvider<Task>,
        aarLibraries: Collection<AndroidArchiveLibrary>,
        variant: LibraryVariant,
    ) {
        bundleTask.configure { task ->
            task.doLast {
                aarLibraries.forEach {
                    val dataBindingFolder = it.getDataBindingFolder()
                    if (dataBindingFolder.exists()) {
                        val filePath = getReBundleFilePath(dataBindingFolder.name, variant)
                        File(filePath).mkdirs()
                        project.copy { copyTask ->
                            copyTask.from(dataBindingFolder)
                            copyTask.into(filePath)
                        }
                    }

                    val dataBindingLogFolder = it.getDataBindingLogFolder()
                    if (dataBindingLogFolder.exists()) {
                        val filePath = getReBundleFilePath(dataBindingLogFolder.name, variant)
                        File(filePath).mkdirs()
                        project.copy { copyTask ->
                            copyTask.from(dataBindingLogFolder)
                            copyTask.into(filePath)
                        }
                    }
                }
            }
        }
    }

    private fun getReBundleFilePath(folderName: String, variant: LibraryVariant) = "${DirectoryManager.getReBundleDirectory(variant.name).path}/$folderName"
}
