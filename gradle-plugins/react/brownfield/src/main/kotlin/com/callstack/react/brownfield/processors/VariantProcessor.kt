@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.react.brownfield.processors

import com.android.build.gradle.api.LibraryVariant
import com.callstack.react.brownfield.artifacts.ArtifactsResolver.Companion.ARTIFACT_TYPE_AAR
import com.callstack.react.brownfield.artifacts.ArtifactsResolver.Companion.ARTIFACT_TYPE_JAR
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import org.gradle.api.Task
import org.gradle.api.artifacts.ResolvedArtifact
import org.gradle.api.provider.ListProperty
import org.gradle.api.tasks.Copy
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskProvider
import java.io.File

class VariantProcessor(private val variant: LibraryVariant) : BaseProject() {
    private val upperCaseVariantName = variant.name.replaceFirstChar(Char::titlecase)
    private val variantHelper = VariantHelper(variant)
    private val variantTaskProvider = VariantTaskProvider(variantHelper)
    private val jniLibsProcessor = JNILibsProcessor()
    private val proguardProcessor = ProguardProcessor(variant)
    private val explodeTasks = mutableListOf<Task>()
    private val aarLibraries = mutableListOf<AndroidArchiveLibrary>()
    private lateinit var aarLibrariesProperty: ListProperty<AndroidArchiveLibrary>
    private val jarFiles = mutableListOf<File>()
    private var mergeClassTask: TaskProvider<out Task>? = null

    private fun setup() {
        variantHelper.project = project
        variantTaskProvider.project = project
        jniLibsProcessor.project = project
        proguardProcessor.project = project
        aarLibrariesProperty = project.objects.listProperty(AndroidArchiveLibrary::class.java)
        VariantPackagesProperty.getVariantPackagesProperty().put(variant.name, aarLibrariesProperty)
    }

    fun processVariant(artifacts: Collection<ResolvedArtifact>) {
        setup()
        val preBuildTaskPath = "pre${upperCaseVariantName}Build"
        val prepareTask = project.tasks.named(preBuildTaskPath)

        if (!prepareTask.isPresent) {
            throw TaskNotFound("Can not find $preBuildTaskPath task")
        }

        val bundleTask = variantTaskProvider.bundleTaskProvider(project, variant.name)
        explodeArtifactFiles(artifacts, prepareTask, bundleTask)
        mergeClassesAndJars(bundleTask)

        if (aarLibraries.isEmpty()) return

        variantTaskProvider.processManifestTask(aarLibraries, explodeTasks)
        variantHelper.processResources(aarLibraries, explodeTasks)
        variantHelper.processAssets(aarLibraries, explodeTasks)
        jniLibsProcessor.processJniLibs(aarLibraries, explodeTasks, variant)
        proguardProcessor.processConsumerFiles(aarLibraries, explodeTasks)
        proguardProcessor.processGeneratedFiles(aarLibraries, explodeTasks)
        variantTaskProvider.processDataBinding(bundleTask, aarLibraries)
        variantTaskProvider.processDeepLinkTasks(explodeTasks)
    }

    private fun mergeClassesAndJars(bundleTask: TaskProvider<Task>) {
        val syncLibTask = project.tasks.named(variantHelper.getSyncLibJarsTaskPath())
        val extractAnnotationsTask = project.tasks.named("extract${upperCaseVariantName}Annotations")

        mergeClassTask = variantTaskProvider.classesMergeTask(aarLibraries, jarFiles, explodeTasks)
        syncLibTask.configure {
            it.dependsOn(mergeClassTask)
            it.inputs.files(aarLibraries.map { aarLib -> aarLib.getLibsDir() }).withPathSensitivity(
                PathSensitivity.RELATIVE,
            )
            it.inputs.files(jarFiles).withPathSensitivity(PathSensitivity.RELATIVE)
        }

        project.tasks.named("transform${upperCaseVariantName}ClassesWithAsm").configure {
            it.dependsOn(mergeClassTask)
        }
        extractAnnotationsTask.configure {
            it.mustRunAfter(mergeClassTask)
        }

        if (!variant.buildType.isMinifyEnabled) {
            val mergeJars = variantTaskProvider.jarMergeTask(syncLibTask, aarLibraries, jarFiles, explodeTasks)
            project.tasks.named("bundle${upperCaseVariantName}LocalLintAar").configure {
                it.dependsOn(mergeJars)
            }
            bundleTask.configure {
                it.dependsOn(mergeJars)
            }
        }
    }

    private fun explodeArtifactFiles(
        artifacts: Collection<ResolvedArtifact>,
        prepareTask: TaskProvider<Task>,
        bundleTask: TaskProvider<Task>,
    ) {
        for (artifact in artifacts) {
            when (artifact.type) {
                ARTIFACT_TYPE_JAR -> jarFiles.add(artifact.file)
                ARTIFACT_TYPE_AAR -> processAar(artifact, prepareTask, bundleTask)
            }
        }
    }

    private fun processAar(
        artifact: ResolvedArtifact,
        prepareTask: TaskProvider<Task>,
        bundleTask: TaskProvider<Task>,
    ) {
        val archiveLibrary =
            AndroidArchiveLibrary(
                project,
                artifact,
                variant.name,
            )
        aarLibraries.add(archiveLibrary)
        aarLibrariesProperty.add(archiveLibrary)

        val dependencies = variantHelper.getTaskDependencies(artifact)
        val zipFolder = archiveLibrary.getExplodedAarRootDir()
        zipFolder.mkdirs()

        val explodeTask = getExplodeTask(zipFolder, artifact)
        explodeTask.dependsOn(if (dependencies.isEmpty()) prepareTask else dependencies.first())

        val javacTask = variantHelper.getJavaCompileTask()
        javacTask.dependsOn(explodeTask)

        bundleTask.configure {
            it.dependsOn(explodeTask)
        }
        explodeTasks.add(explodeTask)
    }

    private fun getExplodeTask(
        zipFolder: File,
        artifact: ResolvedArtifact,
    ): Copy {
        val group = artifact.moduleVersion.id.group.replaceFirstChar(Char::titlecase)
        val name = artifact.name.replaceFirstChar(Char::titlecase)
        val taskName = "explode$group$name$upperCaseVariantName"
        val explodeTask =
            project.tasks.create(taskName, Copy::class.java) {
                it.from(project.zipTree(artifact.file.absolutePath))
                it.into(zipFolder)

                it.doFirst {
                    zipFolder.deleteRecursively()
                }
            }
        return explodeTask
    }
}
