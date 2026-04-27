package com.callstack.react.brownfield.plugin

import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.internal.LoggerWrapper
import com.android.build.gradle.internal.coverage.JacocoReportTask.JacocoReportWorkerAction.Companion.logger
import com.android.build.gradle.internal.tasks.factory.dependsOn
import com.android.manifmerger.ManifestMerger2
import com.android.manifmerger.ManifestProvider
import com.android.manifmerger.MergingReport
import com.android.utils.ILogger
import com.callstack.react.brownfield.artifacts.ArtifactsResolver
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.expo.ExpoPublishingHelper
import com.callstack.react.brownfield.processors.JNILibsProcessor
import com.callstack.react.brownfield.processors.ProguardProcessor
import com.callstack.react.brownfield.processors.VariantPackagesProperty
import com.callstack.react.brownfield.processors.VariantTaskProvider
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.BundleTaskProvider
import com.callstack.react.brownfield.shared.Constants.PROJECT_ID
import com.callstack.react.brownfield.shared.ExplodeAarTask
import com.callstack.react.brownfield.shared.Logging
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
import org.gradle.api.tasks.TaskProvider
import org.gradle.api.tasks.bundling.Zip
import java.io.BufferedWriter
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStreamWriter
import javax.inject.Inject

class RNBrownfieldPlugin
    @Inject
    constructor(
        private val taskDependencyFactory: TaskDependencyFactory,
        private val fileResolver: FileResolver,
    ) : Plugin<Project> {
        private lateinit var extension: Extension
        private lateinit var projectConfigurations: ProjectConfigurations
        private lateinit var artifactsResolver: ArtifactsResolver
        private lateinit var project: Project

        private var maybeExpoProject: Project? = null
        private val isExpoProject: Boolean
            get() = maybeExpoProject != null

        override fun apply(project: Project) {
            verifyAndroidPluginApplied(project)

            this.project = project
            initializers()

            // Configure
            projectConfigurations.configure()
            RNSourceSets.configure(project, extension)
            RClassTransformer.registerASMTransformation()

            if (Utils.isExampleLibrary(project.name)) {
                return
            }

            val baseProject = BaseProject()
            baseProject.project = project
            DirectoryManager.project = project
            artifactsResolver =
                ArtifactsResolver(baseProject, extension, this.isExpoProject)
            artifactsResolver.taskDependencyFactory = taskDependencyFactory
            artifactsResolver.fileResolver = fileResolver

            val newArtifacts = artifactsResolver.processDefaultDependencies()

            val jniLibsProcessor = JNILibsProcessor()
            jniLibsProcessor.project = project

            val proguardProcessor = ProguardProcessor()
            proguardProcessor.project = project

            val variantTaskProvider = VariantTaskProvider()
            variantTaskProvider.project = project

            val bundleProvider = BundleTaskProvider(variantTaskProvider)

            // process manifest & merger task
            project.extensions.getByType(LibraryExtension::class.java).libraryVariants.all { variant ->
                val capitalizedVariantName = variant.name.replaceFirstChar(Char::titlecase)

                val explodeTask =
                    project.tasks.register(
                        "explode${capitalizedVariantName}Aar",
                        ExplodeAarTask::class.java,
                    ) { task ->
                        task.variantName.set(variant.name)
                        task.minifyEnabled.set(variant.buildType.isMinifyEnabled)

                        val finalArtifacts = mutableListOf<UnresolvedArtifactInfo>()
                        newArtifacts.forEach { newArt ->
                            val defaultTaskName = "bundle${capitalizedVariantName}Aar"
                            val dependencyProject = project.project(":${newArt.moduleName}")
                            val bundleTaskProvider = bundleProvider.getBundleTask(dependencyProject, variant)
                            val taskName = bundleTaskProvider?.name ?: defaultTaskName

                            dependencyProject.tasks.findByName(taskName)?.let { task.dependsOn(it) }

                            val artifactFile = createArtifactFile(bundleTaskProvider?.get() as Task)
                            finalArtifacts.add(
                                UnresolvedArtifactInfo(
                                    newArt.moduleGroup,
                                    newArt.moduleName,
                                    newArt.moduleVersion,
                                    artifactFile.absolutePath,
                                    setOf(":${newArt.moduleName}:$taskName"),
                                    taskName,
                                ),
                            )
                        }

                        task.inputArtifacts.set(finalArtifacts)
                    }

                preBuildTaskByVariant(capitalizedVariantName, explodeTask)

                val aarLibraries = mutableListOf<AndroidArchiveLibrary>()
                newArtifacts.forEach { art ->
                    val archiveLibrary =
                        AndroidArchiveLibrary(
                            this.project,
                            art,
                            variant.name,
                        )
                    aarLibraries.add(archiveLibrary)
                }

                /**
                 * early return if aarLibraries is empty, no need to register/configure further tasks
                 */
                if (aarLibraries.isEmpty()) {
                    return@all
                }

                /**
                 * Flat IDs to be put into the variant property, required for RClass Transformer
                 */
                val packageIDs = aarLibraries.map { it.getPackageName() }
                VariantPackagesProperty.getVariantPackagesProperty().put(variant.name, packageIDs)

                val processManifestTask = variant.outputs.first().processManifestProvider.get()
                processManifestTask.doLast {
                    // manifest-merger
                    val buildDir = project.layout.buildDirectory.get()
                    val manifestOutput =
                        project.file(
                            "$buildDir/intermediates/merged_manifest/${variant.name}/process${capitalizedVariantName}Manifest/AndroidManifest.xml",
                        )

                    val inputManifests = aarLibraries.map { it.getManifestFile() }
                    manifestMerger(manifestOutput, inputManifests, manifestOutput)
                }

                /** =======  GENERATE RESOURCES =========*/

                /**
                 * See if we can move this block to configure phase of prebuild or resourceGenTask
                 *
                 * Tried adding to resourceGenTask configure, doFirst and doLast. PreBuild doFirst and doLast
                 * but it does not take effect. Adding to preBuild.configure, works.
                 */
                val taskPath = "generate${capitalizedVariantName}Resources"
                val resourceGenTask = project.tasks.named(taskPath)

                if (!resourceGenTask.isPresent) {
                    throw TaskNotFound("Task $taskPath not found")
                }

                variant.registerGeneratedResFolders(
                    project.files(aarLibraries.map { it.getResDir() }),
                )

                /** =======  GENERATE ASSETS ========= */
                val assetsTask = variant.mergeAssetsProvider.get()

                val androidExtension = project.extensions.getByName("android") as LibraryExtension
                assetsTask.doFirst {
                    val filteredSourceSets =
                        androidExtension.sourceSets.filter { it.name == variant.name }

                    filteredSourceSets.forEach { sourceSet ->
                        val filteredAarLibs = aarLibraries.filter { it.getAssetsDir().exists() }
                        if (!filteredAarLibs.isEmpty()) {
                            sourceSet.assets.srcDirs(filteredAarLibs.map { it.getAssetsDir() })
                        }
                    }
                }

                /** ===== jniLibsProcessor ===== */
                jniLibsProcessor.processJniLibs(aarLibraries, variant.name)

                /** ===== proguardProcessor ===== */
                val proguardRules = aarLibraries.map { it.getProguardRules() }
                proguardProcessor.processConsumerFiles(proguardRules, capitalizedVariantName)
                proguardProcessor.processGeneratedFiles(proguardRules, capitalizedVariantName)

                /** ===== processDataBinding ===== */
                val bundleTask = variantTaskProvider.bundleTaskProvider(project, variant.name)
                variantTaskProvider.processDataBinding(bundleTask, aarLibraries, variant.name)

                if (this.isExpoProject) {
                    Logging.log("Expo project detected.")
                    project.evaluationDependsOn(EXPO_PROJECT_LOCATOR)
                }

                project.afterEvaluate {
                    if (this.isExpoProject) {
                        ExpoPublishingHelper(
                            brownfieldAppProject = project,
                        ).afterEvaluate()
                    }
                }
            }
        }

        companion object {
            const val EXPO_PROJECT_LOCATOR = ":expo"
        }

        private fun preBuildTaskByVariant(
            capitalizedVariantName: String,
            explodeAarTask: TaskProvider<ExplodeAarTask>,
        ) {
            val preBuildTaskPath = "pre${capitalizedVariantName}Build"
            val preBuildTask = project.tasks.named(preBuildTaskPath)

            if (!preBuildTask.isPresent) {
                throw TaskNotFound("Can not find $preBuildTaskPath task")
            }

            preBuildTask.dependsOn(explodeAarTask)
            if (capitalizedVariantName.contains("Release")) {
                val projectExt = project.extensions.getByType(Extension::class.java)
                val appProject = project.rootProject.project(projectExt.appProjectName)
                preBuildTask.dependsOn("${appProject.path}:createBundle${capitalizedVariantName}JsAndAssets")
            }
        }

        private fun manifestMerger(
            mainManifestFile: File,
            secondaryManifestFiles: List<File>,
            outputFile: File,
        ) {
            val iLogger: ILogger = LoggerWrapper(logger)
            val mergerInvoker = ManifestMerger2.newMerger(mainManifestFile, iLogger, ManifestMerger2.MergeType.LIBRARY)
            val manifestProviders = mutableListOf<ManifestProvider>()

            val filteredSecondaryManifests = secondaryManifestFiles.filter { it.exists() }
            filteredSecondaryManifests.forEach { file ->
                manifestProviders.add(
                    object : ManifestProvider {
                        override fun getManifest(): File = file.absoluteFile

                        override fun getName(): String = file.name
                    },
                )
            }

            mergerInvoker.addManifestProviders(manifestProviders)
            val mergingReport: MergingReport = mergerInvoker.merge()

            BufferedWriter(OutputStreamWriter(FileOutputStream(outputFile), "UTF-8")).use { writer ->
                writer.append(mergingReport.getMergedDocument(MergingReport.MergedManifestKind.MERGED))
                writer.flush()
            }
        }

        private fun initializers() {
            RClassTransformer.project = project
            Logging.project = project
            this.extension = project.extensions.create(Extension.NAME, Extension::class.java)
            projectConfigurations = ProjectConfigurations(project)
            VariantPackagesProperty.setVariantPackagesProperty(project)
            this.maybeExpoProject = project.findProject(EXPO_PROJECT_LOCATOR)
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

        private fun createArtifactFile(bundle: Task): File {
            val packageLibraryProvider = bundle as Zip
            return File(packageLibraryProvider.destinationDirectory.get().asFile, packageLibraryProvider.archiveFileName.get())
        }
    }
