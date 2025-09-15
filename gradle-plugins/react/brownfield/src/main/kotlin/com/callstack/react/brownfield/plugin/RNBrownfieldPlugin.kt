package com.callstack.react.brownfield.plugin

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
        private lateinit var project: Project
        private lateinit var extension: Extension
        private lateinit var projectConfigurations: ProjectConfigurations

        override fun apply(project: Project) {
            verifyAndroidPluginApplied(project)

            initializers(project)
            /**
             * Make sure that expo project is evaluated before the android library.
             * This ensures that the expo modules are available to link with the
             * android library, when it is evaluated.
             *
             * this.extension.isExpo &&
             */
            if (!Utils.isExampleLibrary(project.project.name)) {
                project.evaluationDependsOn(":expo")
            }

            RNSourceSets.configure(project, extension)
            projectConfigurations.setup()
            registerRClassTransformer()

            project.afterEvaluate {
                afterEvaluate()
            }
        }

        private fun initializers(project: Project) {
            this.project = project
            Logging.project = project
            DirectoryManager.project = project
            RClassTransformer.project = project
            this.extension = project.extensions.create(Extension.NAME, Extension::class.java)
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

        /**
         * Transforms RClass
         */
        private fun registerRClassTransformer() {
            RClassTransformer.registerASMTransformation()
        }

        private fun afterEvaluate() {
            val baseProject = BaseProject()
            baseProject.project = project
            val artifactsResolver = ArtifactsResolver(projectConfigurations.getConfigurations(), baseProject, extension)
            artifactsResolver.calculatedValueContainerFactory = calculatedValueContainerFactory
            artifactsResolver.taskDependencyFactory = taskDependencyFactory
            artifactsResolver.fileResolver = fileResolver
            artifactsResolver.processArtifacts()
        }
    }
