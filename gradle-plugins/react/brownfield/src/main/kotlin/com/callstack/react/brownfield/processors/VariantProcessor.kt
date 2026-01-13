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
import com.android.build.gradle.internal.tasks.factory.dependsOn
import com.callstack.react.brownfield.artifacts.ArtifactsResolver.Companion.ARTIFACT_TYPE_AAR
import com.callstack.react.brownfield.artifacts.ArtifactsResolver.Companion.ARTIFACT_TYPE_JAR
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import org.gradle.api.Task
import org.gradle.api.artifacts.ResolvedArtifact
import org.gradle.api.provider.ListProperty
import org.gradle.api.tasks.Copy
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskProvider
import java.io.File

class VariantProcessor(private val variant: LibraryVariant) : BaseProject() {
    private val capitalizedVariantName = variant.name.replaceFirstChar(Char::titlecase)
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

    fun processVariant(artifacts: List<UnresolvedArtifactInfo>) {
        setup()
        val preBuildTaskPath = "pre${capitalizedVariantName}Build"
        val prepareTask = project.tasks.named(preBuildTaskPath)

        if (!prepareTask.isPresent) {
            throw TaskNotFound("Can not find $preBuildTaskPath task")
        }

        if (capitalizedVariantName.contains("Release")) {
            prepareTask.dependsOn(":app:createBundle${capitalizedVariantName}JsAndAssets")
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
        val extractAnnotationsTask = project.tasks.named("extract${capitalizedVariantName}Annotations")

        mergeClassTask = variantTaskProvider.classesMergeTask(aarLibraries, jarFiles, explodeTasks)
        syncLibTask.configure {
            println("\n==== syncLibTask Configured\n")
            it.dependsOn(mergeClassTask)
            it.inputs.files(aarLibraries.map { aarLib -> aarLib.getLibsDir() }).withPathSensitivity(
                PathSensitivity.RELATIVE,
            )
            it.inputs.files(jarFiles).withPathSensitivity(PathSensitivity.RELATIVE)

            it.doLast {
                println("\n==== syncLibTask doLast ====\n")
            }
        }

        project.tasks.named("transform${capitalizedVariantName}ClassesWithAsm").configure {
            println("\n==== transformAsm Configured\n")
            it.dependsOn(mergeClassTask)

            it.doLast {
                println("\n==== transformAsm doLast ====\n")
            }
        }

        extractAnnotationsTask.configure {
            println("\n==== extractAnnotationsTask Configured\n")
            it.mustRunAfter(mergeClassTask)

            it.doLast {
                println("\n==== extractAnnotationsTask doLast ====\n")
            }
        }

        if (!variant.buildType.isMinifyEnabled) {
            val mergeJars = variantTaskProvider.jarMergeTask(syncLibTask, aarLibraries, jarFiles, explodeTasks)
            project.tasks.named("bundle${capitalizedVariantName}LocalLintAar").configure {
                println("\n==== bundle${capitalizedVariantName}LocalLintAar Configured\n")
                it.dependsOn(mergeJars)

                it.doLast {
                    println("\n==== bundle${capitalizedVariantName}LocalLintAar doLast ====\n")
                }
            }
            bundleTask.configure {
                println("\n==== mergeClassesAndJars ${bundleTask.name} Configured\n")
                it.dependsOn(mergeJars)

                it.doLast {
                    println("\n==== mergeClassesAndJars ${bundleTask.name} doLast ====\n")
                }
            }
        }
    }

    private fun explodeArtifactFiles(
        artifacts: List<UnresolvedArtifactInfo>,
        prepareTask: TaskProvider<Task>,
        bundleTask: TaskProvider<Task>,
    ) {
        for (artifact in artifacts) {
//            when (artifact.type) {
//                ARTIFACT_TYPE_JAR -> jarFiles.add(artifact.file)
//                ARTIFACT_TYPE_AAR -> processAar(artifact, prepareTask, bundleTask)
//            }
            processAar(artifact, prepareTask, bundleTask)
        }
    }

    private fun processAar(
        artifact: UnresolvedArtifactInfo,
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

        val zipFolder = archiveLibrary.getExplodedAarRootDir()
        zipFolder.mkdirs()

        val explodeTask = getExplodeTask(zipFolder, artifact)
        if (explodeTask != null) {
            val dependencies = artifact.dependencies

            val selectedTask = if (dependencies?.isEmpty() == true) prepareTask else dependencies?.first()

            println("=== selectedTask $selectedTask")
            explodeTask.dependsOn(selectedTask)

            val javacTask = variantHelper.getJavaCompileTask()
            javacTask.dependsOn(explodeTask)

            bundleTask.configure {
                println("\n==== processAar ${bundleTask.name} Configured\n")
                it.dependsOn(explodeTask)

                it.doLast {
                    println("\n==== processAar ${bundleTask.name} doLast ====\n")
                }
            }

            explodeTasks.add(explodeTask)
        }
    }

    private fun getExplodeTask(
        zipFolder: File,
        artifact: UnresolvedArtifactInfo,
    ): Copy? {
        val group = artifact.moduleGroup.replaceFirstChar(Char::titlecase)
        val name = artifact.moduleName.replaceFirstChar(Char::titlecase)
        val taskName = "explode$group$name$capitalizedVariantName"

        if (project.tasks.findByName(taskName) == null) {
            val explodeTask =
                project.tasks.create(taskName, Copy::class.java) {
                    println("\n==== $taskName Configured\n")
                    it.from(project.zipTree(artifact.file.absolutePath))
                    it.into(zipFolder)

                    it.doFirst {
                        println("\n==== $taskName -- doFirst\n")
                        zipFolder.deleteRecursively()
                    }

                    it.doLast {
                        println("\n==== $taskName -- doLast\n")
                    }
                }
            return explodeTask
        }

        return null
    }
}
