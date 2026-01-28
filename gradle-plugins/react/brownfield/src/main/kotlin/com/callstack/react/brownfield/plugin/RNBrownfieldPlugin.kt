package com.callstack.react.brownfield.plugin

import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.internal.LoggerWrapper
import com.android.build.gradle.internal.coverage.JacocoReportTask.JacocoReportWorkerAction.Companion.logger
import com.android.manifmerger.ManifestMerger2
import com.android.manifmerger.ManifestProvider
import com.android.manifmerger.MergingReport
import com.android.utils.ILogger
import com.callstack.react.brownfield.artifacts.ArtifactsResolver
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.processors.JNILibsProcessor
import com.callstack.react.brownfield.processors.ProguardProcessor
import com.callstack.react.brownfield.processors.VariantPackagesProperty
import com.callstack.react.brownfield.processors.VariantTaskProvider
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.Constants.PROJECT_ID
import com.callstack.react.brownfield.shared.ExplodeAarTask
import com.callstack.react.brownfield.shared.GenerateTPLAar
import com.callstack.react.brownfield.shared.JsonInstance
import com.callstack.react.brownfield.shared.ProcessArtifactsTask
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.ProjectConfigurationException
import org.gradle.api.internal.file.FileResolver
import org.gradle.api.internal.tasks.TaskDependencyFactory
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


    override fun apply(project: Project) {
        verifyAndroidPluginApplied(project)
        initializers(project)

        this.project = project
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
            ArtifactsResolver(projectConfigurations.getConfigurations(), baseProject, extension)
        artifactsResolver.taskDependencyFactory = taskDependencyFactory
        artifactsResolver.fileResolver = fileResolver

        artifactsResolver.processDefaultDependencies()

        val processArtifactsTask =
            project.tasks.register("processArtifacts", ProcessArtifactsTask::class.java) {
                it.artifactsResolver.set(artifactsResolver)
                it.outputFile.set(project.layout.buildDirectory.file("artifacts.txt"))
                it.artifactOutput.set(project.layout.buildDirectory.file("artifacts-list.jsonl"))
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
        }

        val jniLibsProcessor = JNILibsProcessor()
        jniLibsProcessor.project = project

        val proguardProcessor = ProguardProcessor()
        proguardProcessor.project = project

        val variantTaskProvider = VariantTaskProvider()
        variantTaskProvider.project = project

        // process manifest & merger task
        project.extensions.getByType(LibraryExtension::class.java).libraryVariants.all { variant ->
            val capitalizedVariantName = variant.name.replaceFirstChar(Char::titlecase)
            val processManifestTask = variant.outputs.first().processManifestProvider.get()

            val artifacts = readArtifacts(processArtifactsTask.get().artifactOutput.get().asFile)
            val filteredArtifacts = artifacts.filter { it.bundleTaskName?.contains(capitalizedVariantName) == true }
            val aarLibraries = mutableListOf<AndroidArchiveLibrary>()
            filteredArtifacts.forEach { art ->
                val archiveLibrary =
                    AndroidArchiveLibrary(
                        this.project,
                        art,
                        variant.name,
                    )
                aarLibraries.add(archiveLibrary)
            }

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

            aarLibraries.forEach {
                variant.registerGeneratedResFolders(
                    project.files(it.getResDir()),
                )
            }

            /** =======  GENERATE ASSETS ========= */
            val assetsTask = variant.mergeAssetsProvider.get()

            val androidExtension = project.extensions.getByName("android") as LibraryExtension
            assetsTask.doFirst {
                val filteredSourceSets = androidExtension.sourceSets.filter { it.name == variant.name }

                filteredSourceSets.forEach { sourceSet ->
                    val filteredAarLibs = aarLibraries.filter { it.getAssetsDir().exists() }
                    filteredAarLibs.forEach {
                        sourceSet.assets.srcDir(it.getAssetsDir())
                    }
                }
            }

            jniLibsProcessor.processJniLibs(aarLibraries, variant)
            val proguardRules = aarLibraries.map { it.getProguardRules() }

            proguardProcessor.processConsumerFiles(proguardRules, capitalizedVariantName)
            proguardProcessor.processGeneratedFiles(proguardRules, capitalizedVariantName)

            /** ===== processDataBinding ===== */
            val bundleTask = variantTaskProvider.bundleTaskProvider(project, variant.name)
            variantTaskProvider.processDataBinding(bundleTask, aarLibraries, variant)
        }

        project.tasks.register("general", ExplodeAarTask::class.java) { task ->
            task.inputArtifactListFile.set(processArtifactsTask.get().artifactOutput)
        }
    }

    private fun readArtifacts(file: File): List<UnresolvedArtifactInfo> {
        if (!file.exists()) return emptyList()

        return file.readLines()
            .filter { it.isNotBlank() }
            .map { JsonInstance.json.decodeFromString<UnresolvedArtifactInfo>(it) }
    }

    private fun manifestMerger(mainManifestFile: File, secondaryManifestFiles: List<File>, outputFile: File) {
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
