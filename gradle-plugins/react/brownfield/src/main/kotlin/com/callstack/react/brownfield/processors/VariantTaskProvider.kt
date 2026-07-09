package com.callstack.react.brownfield.processors

import com.android.build.gradle.internal.tasks.factory.dependsOn
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.shared.ExplodeAarTask
import com.callstack.react.brownfield.shared.MergeClassesTask
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
        variantName: String,
        buildTypeName: String,
        isVariantDebuggable: Boolean,
        explodeAarTask: TaskProvider<ExplodeAarTask>,
    ) {
        val preBuildTaskPath = "pre${variantName.capitalized()}Build"
        val preBuildTask = project.tasks.named(preBuildTaskPath)

        if (!preBuildTask.isPresent) {
            throw TaskNotFound("Can not find $preBuildTaskPath task")
        }

        preBuildTask.dependsOn(explodeAarTask)

        val bundledAssetsVariantName =
            VariantHelper.getBundledAssetsVariantName(
                variantName = variantName,
                buildTypeName = buildTypeName,
                isDebuggable = isVariantDebuggable,
            )
        val capitalizedBundledAssetsVariantName = bundledAssetsVariantName.capitalized()

        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = project.rootProject.project(projectExt.appProjectName)
        preBuildTask.dependsOn("${appProject.path}:createBundle${capitalizedBundledAssetsVariantName}JsAndAssets")

        if (Utils.isExpoProject(project)) {
            val updatesResourcesTaskName = VariantHelper.getExpoUpdatesResourcesTaskName(variantName)
            if (Utils.hasExpoUpdates(appProject, variantName)) {
                preBuildTask.dependsOn("${appProject.path}:$updatesResourcesTaskName")
            }
        }
    }

    fun mergeClasses(
        aarLibraries: Collection<AndroidArchiveLibrary>,
        explodeTasks: TaskProvider<ExplodeAarTask>,
        variantName: String,
    ): TaskProvider<MergeClassesTask> {
        val capitalizedVariantName = variantName.capitalized()
        val mergeClassesTaskName = "mergeClasses$capitalizedVariantName"

        return project.tasks.register(mergeClassesTaskName, MergeClassesTask::class.java) {
            it.dependsOn(explodeTasks)
            it.dependsOn(VariantHelper.getKotlinCompileTask(project, capitalizedVariantName))
            it.dependsOn(VariantHelper.getJavaCompileTask(project, capitalizedVariantName))
            it.variantName.set(variantName)
            it.inputClassesJars.from(aarLibraries.map { aarLibrary -> aarLibrary.getClassesJarFile() })
            it.outputDir.set(DirectoryManager.getMergeClassDirectory(variantName))
        }
    }
}
