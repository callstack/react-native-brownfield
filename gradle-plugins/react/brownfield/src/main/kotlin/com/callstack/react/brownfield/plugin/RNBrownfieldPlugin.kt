package com.callstack.react.brownfield.plugin

import com.android.build.api.variant.LibraryAndroidComponentsExtension
import com.android.build.gradle.internal.crash.afterEvaluate
import com.callstack.react.brownfield.artifacts.ArtifactsResolver
import com.callstack.react.brownfield.processors.VariantPackagesProperty
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.Constants.PROJECT_ID
import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.utils.DirectoryManager
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.ProjectConfigurationException
import org.gradle.api.internal.file.FileResolver
import org.gradle.api.internal.tasks.TaskDependencyFactory
import org.gradle.internal.model.CalculatedValueContainerFactory
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


    override fun apply(project: Project) {
            verifyAndroidPluginApplied(project)
            initializers(project)

            println("=== Applying $PROJECT_ID ===")

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
        artifactsResolver = ArtifactsResolver(projectConfigurations.getConfigurations(), baseProject, extension)
        artifactsResolver.calculatedValueContainerFactory = calculatedValueContainerFactory
        artifactsResolver.taskDependencyFactory = taskDependencyFactory
        artifactsResolver.fileResolver = fileResolver

        artifactsResolver.processDefaultDependencies()


        artifactsResolver.processArtifacts()
//        project.tasks.register("processArtifacts") {
//            it.doFirst {
//                artifactsResolver.processArtifacts()
//            }
//        }

//        val processArtifactsTask = project.tasks.register("processArtifacts") {
//            println("==== processArtifact Configured ====")
//
////            it.dependsOn(":react-native-safe-area-context:bundleReleaseAar")
//            it.doFirst {
//                println("==== processArtifact doFirst ====")
//                val baseProject = BaseProject()
//                baseProject.project = project
//                val artifactsResolver = ArtifactsResolver(projectConfigurations.getConfigurations(), baseProject, extension)
//                artifactsResolver.calculatedValueContainerFactory = calculatedValueContainerFactory
//                artifactsResolver.taskDependencyFactory = taskDependencyFactory
//                artifactsResolver.fileResolver = fileResolver
//                artifactsResolver.processArtifacts()
//            }
//
//            it.doLast {
//                println("\n==== processArtifact doLast ====\n")
//            }
//        }
//
//
//            project.tasks.named("preBuild").configure {
//                println("==== preBuild Configured first ====")
//                it.dependsOn(processArtifactsTask)
//
//                it.doLast {
//                    println("\n==== preBuild first -> doLast ====\n")
//                }
//            }
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
