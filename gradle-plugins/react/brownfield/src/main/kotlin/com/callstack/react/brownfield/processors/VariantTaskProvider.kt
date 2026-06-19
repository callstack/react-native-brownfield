package com.callstack.react.brownfield.processors

import com.android.build.gradle.internal.tasks.factory.dependsOn
import com.callstack.react.brownfield.exceptions.TaskNotFound
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
        val variantHelper = VariantHelper().also { it.project = project }
        val syncLibJarsTaskName = "sync${variantName.capitalized()}LibJars"
        project.tasks.configureEach { task ->
            if (task.name == syncLibJarsTaskName) {
                task.doFirst {
                    // sync<Variant>LibJars creates the final classes.jar packaged into the AAR.
                    // The merged dependency kotlin_module files must be present before it runs.
                    variantHelper.syncMergedKotlinMetadata(variantName)
                }
                task.doLast {
                    // AGP's sync task may still collapse metadata down to the local module.
                    // Rewrite classes.jar so embedded Kotlin APIs remain visible to consumers.
                    variantHelper.syncMergedKotlinMetadataIntoClassesJar(variantName)
                }
            }
        }
        bundleTask.configure { task ->
            task.doFirst {
                // Kotlin compile/java-res tasks may recreate META-INF outputs after preBuild.
                // Re-sync the merged module metadata just before bundling so the final AAR
                // preserves Kotlin APIs from embedded dependencies.
                variantHelper.syncMergedKotlinMetadata(variantName)
            }
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
            Utils.getBundledAssetsVariantName(
                variantName = variantName,
                buildTypeName = buildTypeName,
                isDebuggable = isVariantDebuggable,
            )
        val capitalizedBundledAssetsVariantName = bundledAssetsVariantName.capitalized()

        val projectExt = project.extensions.getByType(Extension::class.java)
        val appProject = project.rootProject.project(projectExt.appProjectName)
        preBuildTask.dependsOn("${appProject.path}:createBundle${capitalizedBundledAssetsVariantName}JsAndAssets")

        if (Utils.isExpoProject(project)) {
            val updatesResourcesTaskName = Utils.getExpoUpdatesResourcesTaskName(variantName)
            if (Utils.hasExpoUpdates(appProject, variantName)) {
                preBuildTask.dependsOn("${appProject.path}:$updatesResourcesTaskName")
            }
        }
    }
}
