package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.plugin.ManifestMerger
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import com.callstack.react.brownfield.utils.Utils
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.UnknownTaskException
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskProvider
import java.io.File

class VariantTaskProvider(private val variantHelper: VariantHelper) : BaseProject() {
    private val variant = variantHelper.getVariant()
    private val capitalizedVariantName = variant.name.capitalized()

    fun classesMergeTask(
        aarLibraries: Collection<AndroidArchiveLibrary>,
        jarFiles: MutableList<File>,
        explodeTasks: MutableList<Task>,
    ): TaskProvider<Task> {
        val mergeClassesTaskName = "mergeClasses$capitalizedVariantName"
        val kotlinCompileTaskName = "compile${capitalizedVariantName}Kotlin"

        return project.tasks.register(mergeClassesTaskName) {
            it.outputs.upToDateWhen { false }

            it.dependsOn(explodeTasks)
            it.dependsOn(variantHelper.getJavaCompileTask())

            it.dependsOn(project.tasks.named(kotlinCompileTaskName))

            it.inputs.files(variantHelper.getClassesJarFiles(aarLibraries))
                .withPathSensitivity(PathSensitivity.RELATIVE)

            if (variant.buildType.isMinifyEnabled) {
                it.inputs.files(variantHelper.getLocalJarFiles(aarLibraries))
                    .withPathSensitivity(PathSensitivity.RELATIVE)
                it.inputs.files(jarFiles).withPathSensitivity(PathSensitivity.RELATIVE)
            }

            val outputDir = DirectoryManager.getMergeClassDirectory(variant)
            it.outputs.dir(outputDir)

            it.doFirst { variantHelper.classesMergeTaskDoFirst(outputDir) }
            it.doLast { variantHelper.classesMergeTaskDoLast(outputDir, aarLibraries, jarFiles) }
        }
    }

    fun jarMergeTask(
        syncLibTask: TaskProvider<Task>,
        aarLibraries: Collection<AndroidArchiveLibrary>,
        jarFiles: MutableList<File>,
        explodeTasks: MutableList<Task>,
    ): TaskProvider<Task> {
        return project.tasks.register("mergeJars$capitalizedVariantName") {
            it.dependsOn(explodeTasks)
            it.dependsOn(variantHelper.getJavaCompileTask())
            it.mustRunAfter(syncLibTask)

            it.inputs.files(aarLibraries.map { aarLib -> aarLib.getLibsDir() }).withPathSensitivity(
                PathSensitivity.RELATIVE,
            )
            it.inputs.files(jarFiles).withPathSensitivity(PathSensitivity.RELATIVE)
            val outputDir = variantHelper.getLibsDirFile()
            it.outputs.dir(outputDir)

            it.doFirst {
                MergeProcessor.mergeLibsIntoLibs(project, aarLibraries, jarFiles, outputDir)
            }
        }
    }

    fun bundleTaskProvider(
        project: Project,
        variantName: String,
    ): TaskProvider<Task> {
        var bundleTaskPath = "bundle${variantName.capitalized()}"
        return try {
            project.tasks.named(bundleTaskPath)
        } catch (ignored: UnknownTaskException) {
            bundleTaskPath += "Aar"
            project.tasks.named(bundleTaskPath)
        }
    }

    fun processManifestTask(
        aarLibraries: Collection<AndroidArchiveLibrary>,
        explodeTasks: MutableList<Task>,
    ) {
        val processManifestTask = variantHelper.getProcessManifest()
        val manifestOutput =
            project.file(
                "$buildDir/intermediates/merged_manifest/${variant.name}/process${capitalizedVariantName}Manifest/AndroidManifest.xml",
            )

        val inputManifests = aarLibraries.map { it.getManifestFile() }

        val manifestsMergeTask =
            project.tasks.register(
                "merge${capitalizedVariantName}Manifest",
                ManifestMerger::class.java,
            ) {
                it.setGradleVersion(project.gradle.gradleVersion)
                it.setGradlePluginVersion(Utils.getAGPVersion())
                it.setMainManifestFile(manifestOutput)
                it.setSecondaryManifestFiles(inputManifests)
                it.setOutputFile(manifestOutput)
            }

        processManifestTask.dependsOn(explodeTasks)
        processManifestTask.inputs.files(inputManifests)
        processManifestTask.doLast {
            manifestsMergeTask.get().doTaskAction()
        }
    }

    fun processDataBinding(
        bundleTask: TaskProvider<Task>,
        aarLibraries: Collection<AndroidArchiveLibrary>,
    ) {
        bundleTask.configure { task ->
            task.doLast {
                aarLibraries.forEach {
                    val dataBindingFolder = it.getDataBindingFolder()
                    if (dataBindingFolder.exists()) {
                        val filePath = getReBundleFilePath(dataBindingFolder.name)
                        File(filePath).mkdirs()
                        project.copy { copyTask ->
                            copyTask.from(dataBindingFolder)
                            copyTask.into(filePath)
                        }
                    }

                    val dataBindingLogFolder = it.getDataBindingLogFolder()
                    if (dataBindingLogFolder.exists()) {
                        val filePath = getReBundleFilePath(dataBindingLogFolder.name)
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

    fun processDeepLinkTasks(explodeTasks: MutableList<Task>) {
        val taskName = "extractDeepLinksForAar$capitalizedVariantName"
        val extractDeepLinks = project.tasks.named(taskName)

        if (!extractDeepLinks.isPresent) {
            throw TaskNotFound("Task $taskName not found")
        }

        extractDeepLinks.configure {
            it.dependsOn(explodeTasks)
        }
    }

    private fun getReBundleFilePath(folderName: String) =
        "${DirectoryManager.getReBundleDirectory(variant).path}/$folderName"
}
