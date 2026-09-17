package com.callstack.react.brownfield.plugin

import com.android.build.api.variant.LibraryAndroidComponentsExtension
import com.android.build.api.variant.LibraryVariant
import com.callstack.react.brownfield.artifacts.ArtifactsResolver
import com.callstack.react.brownfield.artifacts.RncTransitiveDependencyDiscoverer
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
import com.callstack.react.brownfield.shared.PublishingMetadataInjector
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.shared.VersionMediatingDependencySet
import com.callstack.react.brownfield.shared.dropHardExcludedDependencies
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
        var expoPublishingHelper: ExpoPublishingHelper? = null
        if (this.isExpoProject) {
            expoPublishingHelper = ExpoPublishingHelper(brownfieldAppProject = project)
            expoProjects = expoPublishingHelper.configure()
        }

        /**
         * curates a list of artifacts that we need to bundle with the Aar
         */
        val artifactsResolver = ArtifactsResolver(project, isExpoProject)
        val artifacts = artifactsResolver.processDefaultDependencies(expoProjects)

        /**
         * Registers the POM/Gradle Module Metadata injection hooks eagerly, during
         * configuration — not inside afterEvaluate — per Gradle's guidance against
         * registering tasks from within afterEvaluate. Only supplying the actual dependency
         * set to it (below) needs to wait for afterEvaluate.
         */
        val injector = PublishingMetadataInjector(project)

        /**
         * Discovers and publishes transitive (third-party) dependencies of embedded
         * native modules into this project's POM/Gradle Module Metadata, so a consuming
         * native app resolves them automatically.
         *
         * Deferred to `taskGraph.whenReady` — NOT `afterEvaluate`. `afterEvaluate` on this
         * project only guarantees *this* project has finished configuring; it says nothing
         * about whether an embedded native module project (e.g. `:react-native-screens`) has
         * been evaluated yet, and Gradle does not guarantee sibling projects are configured
         * in any particular order. Confirmed empirically: discovery silently found zero
         * dependencies for every embedded module in this repo's own demo app when run from
         * afterEvaluate, because those modules' `implementation`/`api`/`runtimeOnly`
         * configurations hadn't been populated yet at that point.
         * `taskGraph.whenReady` only fires once the whole build's task graph is resolved,
         * which requires every project whose output this one's tasks depend on (including
         * every embedded module — their compiled output is bundled into this AAR) to already
         * be configured, and still fires before any task executes, so there's no risk of
         * running after PublishingMetadataInjector's hooks have already fired.
         */
        project.gradle.taskGraph.whenReady {
            configureTransitiveDependencyInjection(project, injector, expoPublishingHelper, expoProjects, artifacts)
        }

        val variantTaskProvider = VariantTaskProvider(project)

        val androidComponents = project.extensions.getByType(LibraryAndroidComponentsExtension::class.java)
        androidComponents.onVariants { variant ->
            configureTasks(variant, artifacts, variantTaskProvider)
        }
    }

    companion object {
        const val EXPO_PROJECT_LOCATOR = ":expo"
    }

    @Suppress("LongMethod")
    private fun configureTransitiveDependencyInjection(
        project: Project,
        injector: PublishingMetadataInjector,
        expoPublishingHelper: ExpoPublishingHelper?,
        expoProjects: List<ExpoGradleProjectProjection>,
        artifacts: List<UnresolvedArtifactInfo>,
    ) {
        val transitiveDeps = VersionMediatingDependencySet()
        var rncSupersededCoordinates: Set<Pair<String, String>> = emptySet()

        if (isExpoProject && expoPublishingHelper != null) {
            val expoTransitiveDeps = expoPublishingHelper.discoverAllExpoTransitiveDependencies(expoProjects)
            Logging.log("Merged ${expoTransitiveDeps.size} transitive dependencies discovered from Expo")
            expoTransitiveDeps.forEach {
                Logging.log(
                    "(*) dependency ${it.groupId}:${it.artifactId}:${it.version} (scope: ${it.scope}, " +
                        "${if (it.optional) "optional" else "required"})",
                )
            }
            transitiveDeps.addAll(expoTransitiveDeps)
        }
        // Expo projects get transitive-dependency discovery unconditionally, via the Expo path
        // above — that's the pre-existing, working mechanism this PR isn't meant to change.
        // The RNC discoverer must never also run there: it has no Expo awareness (it doesn't
        // filter by the Expo blacklist), and Expo's own discovery already covers every embedded
        // module — not just Expo's own packages — so running both is both redundant and a
        // source of exactly the coordinate-leak bug this comment is next to.
        if (!isExpoProject && extension.experimentalIncludeTransitiveDependencies) {
            val rncDiscovery = RncTransitiveDependencyDiscoverer(project).discover(artifacts)
            Logging.log(
                "Merged ${rncDiscovery.dependencies.size} transitive dependencies discovered by the RNC discoverer",
            )
            transitiveDeps.addAll(rncDiscovery.dependencies)
            rncSupersededCoordinates = rncDiscovery.supersededCoordinates
        }

        if (isExpoProject || extension.experimentalIncludeTransitiveDependencies) {
            // Coordinates that must never appear in the published metadata at all — Expo's own
            // module coordinates (embedded, not externally resolvable via Maven), the
            // consumer's own root project name, and embedded modules' own coordinates. Distinct
            // from "superseded": those ARE meant to be (re-)injected, just replacing a stale
            // pre-existing entry, so they must not be filtered out of `transitiveDeps` here —
            // only unconditionally-wrong coordinates like these are.
            val hardExcludePredicate: (String, String) -> Boolean = { groupId, artifactId ->
                (expoPublishingHelper?.shouldExcludeDependency(groupId, artifactId) ?: (groupId == project.rootProject.name)) ||
                    artifacts.any { it.moduleGroup == groupId && it.moduleName == artifactId }
            }
            dropHardExcludedDependencies(transitiveDeps, hardExcludePredicate)

            Logging.log(
                "Total of ${transitiveDeps.size} unique transitive dependencies merged for POM/module.json injection",
            )

            val removalPredicate: (String, String) -> Boolean = { groupId, artifactId ->
                hardExcludePredicate(groupId, artifactId) || rncSupersededCoordinates.contains(groupId to artifactId)
            }

            injector.configure(transitiveDeps, removalPredicate)
            Logging.log("PublishingMetadataInjector ran: injected merged transitive dependencies into POM and Gradle Module Metadata")
        } else {
            Logging.log(
                "PublishingMetadataInjector skipped: project is not an Expo project and " +
                    "experimentalIncludeTransitiveDependencies is disabled",
            )
        }
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
