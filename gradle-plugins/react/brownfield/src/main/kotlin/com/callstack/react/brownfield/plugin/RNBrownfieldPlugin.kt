package com.callstack.react.brownfield.plugin

import com.android.build.api.variant.LibraryAndroidComponentsExtension
import com.android.build.api.variant.LibraryVariant
import com.android.build.api.dsl.LibraryExtension
import com.callstack.react.brownfield.artifacts.ArtifactsResolver
import com.callstack.react.brownfield.expo.ExpoPublishingHelper
import com.callstack.react.brownfield.expo.utils.ExpoGradleProjectProjection
import com.callstack.react.brownfield.processors.AssetTaskProcessor
import com.callstack.react.brownfield.processors.ExplodeTaskProvider
import com.callstack.react.brownfield.processors.JNILibsProcessor
import com.callstack.react.brownfield.processors.ManifestTaskProcessor
import com.callstack.react.brownfield.processors.ProguardProcessor
import com.callstack.react.brownfield.processors.ResourceTaskProcessor
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
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.ProjectConfigurationException

class RNBrownfieldPlugin : Plugin<Project> {
    private lateinit var extension: Extension
    private lateinit var project: Project

    private var maybeExpoProject: Project? = null
    private val isExpoProject: Boolean
        get() = maybeExpoProject != null

    override fun apply(project: Project) {
        verifyAndroidPluginApplied(project)

        this.project = project
        initializers()

        val projectConfigurations = ProjectConfigurations(project)
        projectConfigurations.configure()
        RNSourceSets.configure(project, extension)
        RClassTransformer.registerASMTransformation()

        if (Utils.isExampleLibrary(project.name)) {
            return
        }

        if (this.isExpoProject) {
            project.evaluationDependsOn(EXPO_PROJECT_LOCATOR)
        }

        var expoProjects = listOf<ExpoGradleProjectProjection>()
        if (this.isExpoProject) {
            val expoPublishingHelper = ExpoPublishingHelper(brownfieldAppProject = project)
            expoProjects = expoPublishingHelper.configure()
        }

        val artifactsResolver = ArtifactsResolver(project, isExpoProject)
        val artifacts = artifactsResolver.processDefaultDependencies(expoProjects)
        val variantTaskProvider = VariantTaskProvider(project)
        val androidExtension = project.extensions.getByType(LibraryExtension::class.java)
        val androidComponents = project.extensions.getByType(LibraryAndroidComponentsExtension::class.java)

        androidComponents.onVariants { variant ->
            val context = createVariantContext(variant, androidExtension)
            configureTasks(context, artifacts, variantTaskProvider)
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
        this.maybeExpoProject = project.findProject(EXPO_PROJECT_LOCATOR)
    }

    private fun verifyAndroidPluginApplied(project: Project) {
        if (!project.plugins.hasPlugin("com.android.library")) {
            throw ProjectConfigurationException(
                "$PROJECT_ID must be applied to an android library project",
                Throwable("Apply $PROJECT_ID"),
            )
        }
    }

    private fun createVariantContext(
        variant: LibraryVariant,
        androidExtension: LibraryExtension,
    ): VariantContext {
        val buildTypeName = requireNotNull(variant.buildType) {
            "Missing buildType for variant ${variant.name}"
        }

        val minifyEnabled =
            androidExtension.buildTypes
                .findByName(buildTypeName)
                ?.isMinifyEnabled
                ?: variant.isMinifyEnabled

        return VariantContext(
            name = variant.name,
            buildType = buildTypeName,
            productFlavors = variant.productFlavors,
            isMinifyEnabled = minifyEnabled,
        )
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
        variant: VariantContext,
        artifacts: List<UnresolvedArtifactInfo>,
        variantTaskProvider: VariantTaskProvider,
    ) {
        val variantName = variant.name
        val capitalizedVariantName = variantName.replaceFirstChar(Char::titlecase)

        val explodeTask = ExplodeTaskProvider.getTask(variant, project, artifacts)
        variantTaskProvider.preBuildTaskByVariant(capitalizedVariantName, explodeTask)

        val aarLibraries = getAarLibraries(artifacts, variantName)
        val packageIDs = aarLibraries.map { it.getPackageName() }
        VariantPackagesProperty.getVariantPackagesProperty().put(variantName, packageIDs)

        ManifestTaskProcessor.process(variantName, project, aarLibraries)
        ResourceTaskProcessor.process(variantName, project, aarLibraries)
        AssetTaskProcessor.process(variantName, project, aarLibraries)

        val jniLibsProcessor = JNILibsProcessor(project)
        jniLibsProcessor.processJniLibs(aarLibraries, variantName)

        val proguardProcessor = ProguardProcessor(project)
        val proguardRules = aarLibraries.map { it.getProguardRules() }
        proguardProcessor.processConsumerFiles(proguardRules, capitalizedVariantName)
        proguardProcessor.processGeneratedFiles(proguardRules, capitalizedVariantName)

        val bundleTask = variantTaskProvider.bundleTaskProvider(project, variantName)
        variantTaskProvider.processDataBinding(bundleTask, aarLibraries, variantName)
    }
}
