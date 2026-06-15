package com.callstack.react.brownfield.processors

import com.android.build.api.variant.LibraryVariant
import com.callstack.react.brownfield.shared.ExplodeAarTask
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.UnknownTaskException
import org.gradle.api.tasks.TaskProvider
import java.io.File

class VariantTaskProvider(val project: Project) {
    fun bundleTaskProvider(
        project: Project,
        variantName: String,
    ): TaskProvider<Task> {
        var bundleTaskPath = "bundle${variantName.capitalized()}"
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
        variantName: String,
    ) {
        bundleTask.configure { task ->
            task.doLast {
                aarLibraries.forEach {
                    val dataBindingFolder = it.getDataBindingFolder()
                    if (dataBindingFolder.exists()) {
                        val filePath = getReBundleFilePath(dataBindingFolder.name, variantName)
                        File(filePath).mkdirs()
                        project.copy { copyTask ->
                            copyTask.from(dataBindingFolder)
                            copyTask.into(filePath)
                        }
                    }

                    val dataBindingLogFolder = it.getDataBindingLogFolder()
                    if (dataBindingLogFolder.exists()) {
                        val filePath = getReBundleFilePath(dataBindingLogFolder.name, variantName)
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

    private fun getReBundleFilePath(
        folderName: String,
        variantName: String,
    ) = "${DirectoryManager.getReBundleDirectory(
        variantName,
    ).path}/$folderName"

    fun preBuildTaskByVariant(
        variant: LibraryVariant,
        explodeAarTask: TaskProvider<ExplodeAarTask>,
    ) {
        val bundledAssetsVariantName =
            Utils.getBundledAssetsVariantName(
                variantName = variant.name,
                buildTypeName = variant.buildType,
                isDebuggable = variant.debuggable,
            )
        val capitalizedBundledAssetsVariantName = bundledAssetsVariantName.capitalized()

        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = project.rootProject.project(projectExt.appProjectName)
        
        val jsBundleTaskName = "${appProject.path}:createBundle${capitalizedBundledAssetsVariantName}JsAndAssets"

        variant.lifecycleTasks.registerPreBuild(explodeAarTask, jsBundleTaskName)
        if (Utils.isExpoProject(project)) {
            variant.lifecycleTasks.registerPreBuild("${appProject.path}:create${capitalizedBundledAssetsVariantName}UpdatesResources")
        }
    }
}
