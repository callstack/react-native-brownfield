package com.callstack.react.brownfield.plugin

import com.android.build.api.variant.LibraryAndroidComponentsExtension
import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.internal.crash.afterEvaluate
import com.android.build.gradle.internal.tasks.factory.dependsOn
import com.callstack.react.brownfield.artifacts.ArtifactsResolver
import com.callstack.react.brownfield.processors.VariantHelper
import com.callstack.react.brownfield.processors.VariantPackagesProperty
import com.callstack.react.brownfield.processors.VariantTaskProvider
import com.callstack.react.brownfield.shared.ArtifactRegistrationTask
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.Constants.PROJECT_ID
import com.callstack.react.brownfield.shared.ExplodeAarTask
import com.callstack.react.brownfield.shared.GenerateTPLAar
import com.callstack.react.brownfield.shared.JsonInstance
import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.shared.MergeClassesAndJarsTask
import com.callstack.react.brownfield.shared.ProcessArtifactsTask
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.ProjectConfigurationException
import org.gradle.api.Task
import org.gradle.api.internal.file.FileResolver
import org.gradle.api.internal.tasks.TaskDependencyFactory
import org.gradle.api.tasks.Copy
import org.gradle.api.tasks.TaskProvider
import org.gradle.internal.model.CalculatedValueContainerFactory
import java.io.File
import javax.inject.Inject

class RNBrownfieldPlugin
@Inject
constructor(
    private val calculatedValueContainerFactory: CalculatedValueContainerFactory,
    private val taskDependencyFactory: TaskDependencyFactory,
    private val fileResolver: FileResolver,
) : Plugin<Project> {
    private lateinit var extension: Extension
    private lateinit var projectConfigurations: ProjectConfigurations
    private lateinit var artifactsResolver: ArtifactsResolver

    private lateinit var project: Project


    override fun apply(project: Project) {
            verifyAndroidPluginApplied(project)
            initializers(project)

            println("=== Applying $PROJECT_ID ===")

            this.project = project
            // Configure
            projectConfigurations.configure()
            RNSourceSets.configure(project, extension)
            RClassTransformer.registerASMTransformation()

            if (Utils.isExampleLibrary(project.name)) {
                return
            }
            // Register tasks
//            project.tasks.named("preDebugBuild").configure {
//                println("==== Hello Debug ====")
//            }
//
//            project.tasks.named("preReleaseBuild").configure {
//                println("==== Hello Release ====")
//            }

        val baseProject = BaseProject()
        baseProject.project = project
        DirectoryManager.project = project
        artifactsResolver = ArtifactsResolver(projectConfigurations.getConfigurations(), baseProject, extension)
        artifactsResolver.calculatedValueContainerFactory = calculatedValueContainerFactory
        artifactsResolver.taskDependencyFactory = taskDependencyFactory
        artifactsResolver.fileResolver = fileResolver

        artifactsResolver.processDefaultDependencies()
//        artifactsResolver.processArtifacts()

        val processArtifactsTask = project.tasks.register("processArtifacts", ProcessArtifactsTask::class.java) {
            it.artifactsResolver.set(artifactsResolver)
            it.outputFile.set(project.layout.buildDirectory.file("artifacts.txt"))
            it.artifactOutput.set(project.layout.buildDirectory.file("artifacts-list.jsonl"))
        }

        val artifactRegistrationTask = project.tasks.register("artifactRegistration",
            ArtifactRegistrationTask::class.java) {
//            it.dependsOn(processArtifactsTask)
//            it.inputArtifacts.set(processArtifactsTask.get().outputArtifacts)
            it.inputFile.set(processArtifactsTask.flatMap { t -> t.outputFile })


//            processArtifactsTask.get().outputArtifacts.get().forEach { it1 ->
//                it.dependsOn(":${it1.moduleName}:bundleReleaseAar")
//            }
        }


        /**
         * Trigger the processVariants internal here to register the tasks
         * - Can not do this because they require artifacts and we only get those in preBuild
         * - let's try invoking those in preBuild configuration phase?
         *
         * - add explode tasks to explode.txt as part of processArtifacts
         * - read that file to register task dependency in preBuild
         * - basically what can be evaluated earlier in processArtifacts should be moved there and later read in preBuild
         * - Also once this is done, invoke a function like processVariant directly in preBuild.configure phase to register
         * all the tasks required.
         * */

        project.tasks.register("generateTPLAar", GenerateTPLAar::class.java) { task ->
            task.inputTaskList.set(processArtifactsTask.get().outputFile)

            val file = task.inputTaskList.get().asFile
            if (file.exists()) {
                file.readLines().forEach { line ->
                    val lineSplits = line.split(",")

                    val projectPath = lineSplits[0]
                    val taskName = lineSplits[1]
                    val artifactProject = project.rootProject.project(projectPath)

                    artifactProject.tasks.findByName(taskName)?.let { task.dependsOn(it) }
                }
            }
        }

       project.tasks.register("explodeAarTask", ExplodeAarTask::class.java) { task ->
           task.inputArtifactListFile.set(processArtifactsTask.get().artifactOutput)

           task.doFirst {
               project.extensions.getByType(LibraryExtension::class.java).libraryVariants.all { variant ->
                   val variantHelper = VariantHelper(variant)
                   variantHelper.project = project
                   
                   variantHelper.classesMergeTaskDoFirst(
                       DirectoryManager.getMergeClassDirectory(
                           variant
                       )
                   )
               }
           }

            task.doLast {
                val file = task.inputArtifactListFile.get().asFile
                val artifacts = readArtifacts(file)
                project.extensions.getByType(LibraryExtension::class.java).libraryVariants.all { variant ->
                    val variantHelper = VariantHelper(variant)
                    variantHelper.project = project

                    val aarLibraries = mutableListOf<AndroidArchiveLibrary>()
                    artifacts.forEach { art ->
                        val archiveLibrary =
                            AndroidArchiveLibrary(
                                this.project,
                                art,
                                variant.name,
                            )

                        aarLibraries.add(archiveLibrary)

                        val zipFolder = archiveLibrary.getExplodedAarRootDir()
                        zipFolder.mkdirs()

                        project.copy { it1 ->
                            zipFolder.deleteRecursively()
                            it1.from(project.zipTree(art.file))
                            it1.into(zipFolder)
                        }
                    }

                    variantHelper.classesMergeTaskDoLast(DirectoryManager.getMergeClassDirectory(variant), aarLibraries, mutableListOf())
                }
            }
        }

//        project.extensions.getByType(LibraryExtension::class.java).libraryVariants.all { variant ->
//            val variantHelper = VariantHelper(variant)
//            variantHelper.project = project
//            val capitalizedVariantName = variant.name.replaceFirstChar(Char::titlecase)
//
//            val mergeClassesTaskName = "mergeClasses$capitalizedVariantName"
//            project.tasks.register(mergeClassesTaskName, MergeClassesAndJarsTask::class.java) { task ->
//                task.inputArtifactListFile.set(processArtifactsTask.get().artifactOutput)
//
//                task.doFirst {
//                    variantHelper.classesMergeTaskDoFirst(    DirectoryManager.getMergeClassDirectory(variant))
//                }
//                task.doLast {
//                    val file = task.inputArtifactListFile.get().asFile
//                    val artifacts = readArtifacts(file)
//
//                    val aarLibraries = mutableListOf<AndroidArchiveLibrary>()
//                    artifacts.forEach {
//                        aarLibraries.add(AndroidArchiveLibrary(
//                            project,
//                            it,
//                            variant.name,
//                        ))
//                    }
//                    variantHelper.classesMergeTaskDoLast(DirectoryManager.getMergeClassDirectory(variant), aarLibraries, mutableListOf())
//                }
//            }
//        }
//

            project.tasks.named("preBuild").configure { preBuild ->
                println("==== preBuild Configured first ====")
                preBuild.doLast {
                    println("\n==== preBuild first -> doLast ====\n")
                }
            }
        }

    private fun readArtifacts(file: File): List<UnresolvedArtifactInfo> {
        if (!file.exists()) return emptyList()

        return file.readLines()
            .filter { it.isNotBlank() }
            .map { JsonInstance.json.decodeFromString<UnresolvedArtifactInfo>(it) }
    }

    private fun processAar(
        artifact: UnresolvedArtifactInfo,
        bundleTask: TaskProvider<Task>,
        variantName: String,
        variantHelper: VariantHelper
    ) {
        val archiveLibrary =
            AndroidArchiveLibrary(
                this.project,
                artifact,
                variantName,
            )

//        aarLibraries.add(archiveLibrary)
//        aarLibrariesProperty.add(archiveLibrary)

        val zipFolder = archiveLibrary.getExplodedAarRootDir()
        zipFolder.mkdirs()

//        val explodeTask = getExplodeTask(zipFolder, artifact, variantName.replaceFirstChar(Char::titlecase))
//        if (explodeTask != null) {
//            val dependencies = artifact.dependencies
//
//            if (dependencies?.isEmpty() == false) {
//                println("=== selectedTask ${dependencies.first()}")
//                explodeTask.dependsOn(dependencies.first())
//            }
//
//            val javacTask = variantHelper.getJavaCompileTask()
//            javacTask.dependsOn(explodeTask)
//
////            bundleTask.dependsOn(explodeTask.name)
//
////            explodeTasks.add(explodeTask)
//        }
    }

    private fun getExplodeTask(
        zipFolder: File,
        artifact: UnresolvedArtifactInfo,
        capitalizedVariantName: String
    ): Copy? {
        val group = artifact.moduleGroup.replaceFirstChar(Char::titlecase)
        val name = artifact.moduleName.replaceFirstChar(Char::titlecase)
        val taskName = "explode$group$name$capitalizedVariantName"

        if (project.tasks.findByName(taskName) == null) {
            val explodeTask =
                project.tasks.create(taskName, Copy::class.java) {
                    println("\n==== $taskName Configured\n")
                    it.from(project.zipTree(artifact.file))
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

        private fun initializers(project: Project) {
            this.extension = project.extensions.create(Extension.NAME, Extension::class.java)
            RClassTransformer.project = project
            projectConfigurations = ProjectConfigurations(project)
            VariantPackagesProperty.setVariantPackagesProperty(project)
        }

        /**
         * Verifies and throws error if `com.android.library` plugin is not applied
         */
        private fun verifyAndroidPluginApplied(project: Project) {
            if (!project.plugins.hasPlugin("com.android.library")) {
                throw ProjectConfigurationException(
                    "$PROJECT_ID must be applied to an android library project",
                    Throwable("Apply $PROJECT_ID"),
                )
            }
        }
    }
