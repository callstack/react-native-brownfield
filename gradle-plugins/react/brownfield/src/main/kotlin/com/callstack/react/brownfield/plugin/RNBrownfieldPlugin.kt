package com.callstack.react.brownfield.plugin

import com.android.build.api.variant.LibraryAndroidComponentsExtension
import com.android.build.api.variant.LibraryVariant
import com.callstack.react.brownfield.artifacts.ArtifactsResolver
import com.callstack.react.brownfield.expo.ExpoPublishingHelper
import com.callstack.react.brownfield.expo.utils.ExpoGradleProjectProjection
import com.callstack.react.brownfield.processors.AssetTaskProcessor
import com.callstack.react.brownfield.processors.ExplodeTaskProvider
import com.callstack.react.brownfield.processors.JNILibsProcessor
import com.callstack.react.brownfield.processors.ManifestTaskProcessor
import com.callstack.react.brownfield.processors.ProguardProcessor
import com.callstack.react.brownfield.processors.ResourceTaskProcessor
import com.callstack.react.brownfield.processors.VariantHelper
import com.callstack.react.brownfield.processors.VariantPackagesProperty
import com.callstack.react.brownfield.processors.VariantTaskProvider
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.Constants.PROJECT_ID
import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.ProjectConfigurationException

class RNBrownfieldPlugin : Plugin<Project> {
    private lateinit var extension: Extension
    private lateinit var project: Project

    private val isExpoProject: Boolean
        get() = Utils.isExpoProject(project)

    override fun apply(project: Project) {
        verifyAndroidPluginApplied(project)

        this.project = project
        initializers()

        val projectConfigurations = ProjectConfigurations(project)
        projectConfigurations.configure()
        RNSourceSets.configure(project, extension)
        RClassTransformer.registerASMTransformation()

        /**
         * Must run before processDefaultDependencies: ArtifactsResolver reads :expo's api configuration,
         * which is only populated after the expo project is evaluated.
         */
        if (this.isExpoProject) {
            project.evaluationDependsOn(EXPO_PROJECT_LOCATOR)
        }

        var expoProjects = listOf<ExpoGradleProjectProjection>()
        if (this.isExpoProject) {
            val expoPublishingHelper = ExpoPublishingHelper(brownfieldAppProject = project)
            expoProjects = expoPublishingHelper.configure()
        }

        /**
         * curates a list of artifacts that we need to bundle with the Aar
         */
        val artifactsResolver = ArtifactsResolver(project, isExpoProject)
        val artifacts = artifactsResolver.processDefaultDependencies(expoProjects)

        val variantTaskProvider = VariantTaskProvider(project)

        val androidComponents = project.extensions.getByType(LibraryAndroidComponentsExtension::class.java)
        androidComponents.onVariants { variant ->
            configureTasks(variant, artifacts, variantTaskProvider)
        }
    }

    companion object {
        const val EXPO_PROJECT_LOCATOR = ":expo"
    }

    private fun initializers() {
        RClassTransformer.project = project
        Logging.project = project
        val baseProject = BaseProject()
        baseProject.project = project
        DirectoryManager.project = project

        this.extension = project.extensions.create(Extension.NAME, Extension::class.java)
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

    private fun getAarLibraries(
        artifacts: List<UnresolvedArtifactInfo>,
        variantName: String,
    ): List<AndroidArchiveLibrary> {
        val aarLibraries = mutableListOf<AndroidArchiveLibrary>()
        artifacts.forEach { art ->
            val archiveLibrary =
                AndroidArchiveLibrary(
                    this.project,
                    art,
                    variantName,
                )
            aarLibraries.add(archiveLibrary)
        }

        return aarLibraries
    }

    private fun configureTasks(
        variant: LibraryVariant,
        artifacts: List<UnresolvedArtifactInfo>,
        variantTaskProvider: VariantTaskProvider,
    ) {
        val variantName = variant.name
        val capitalizedVariantName = variantName.capitalized()

        /** =======  EXPLODE AAR  =========*/
        val explodeTask = ExplodeTaskProvider.getTask(variant, project, artifacts)

        /** =======  Pre<Variant>Build  =========*/
        variantTaskProvider.preBuildTaskByVariant(
            variant,
            explodeTask,
        )

        val aarLibraries = getAarLibraries(artifacts, variantName)

        ManifestTaskProcessor.process(project, variant, aarLibraries)
        ResourceTaskProcessor.process(project, variant, aarLibraries, explodeTask)
        AssetTaskProcessor.process(project, variant, aarLibraries, explodeTask)

        /** =======  MERGE CLASSES  =========*/
        val mergeClassesTask = variantTaskProvider.mergeClasses(aarLibraries, explodeTask, variantName)
        VariantHelper.getAsmTransformTask(project, capitalizedVariantName).configureEach {
            it.dependsOn(mergeClassesTask)
        }

        /**
         * Flat IDs to be put into the variant property, required for RClass Transformer
         */
        val packageIDs = aarLibraries.map { it.getPackageName() }
        VariantPackagesProperty.getVariantPackagesProperty().put(variantName, packageIDs)

        /** ===== jniLibsProcessor ===== */
        val jniLibsProcessor = JNILibsProcessor(project)
        jniLibsProcessor.processJniLibs(aarLibraries, variant)

        /** ===== proguardProcessor ===== */
        val proguardProcessor = ProguardProcessor(project)
        val proguardRules = aarLibraries.map { it.getProguardRules() }
        proguardProcessor.processFiles(proguardRules, variantName.capitalized(), explodeTask)
    }
}
