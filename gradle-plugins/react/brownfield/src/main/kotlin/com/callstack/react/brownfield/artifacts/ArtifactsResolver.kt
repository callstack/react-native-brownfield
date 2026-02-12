@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.react.brownfield.artifacts

import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.api.LibraryVariant
import com.callstack.react.brownfield.plugin.ProjectConfigurations.Companion.CONFIG_NAME
import com.callstack.react.brownfield.plugin.ProjectConfigurations.Companion.CONFIG_SUFFIX
import com.callstack.react.brownfield.processors.VariantHelper
import com.callstack.react.brownfield.processors.VariantProcessor
import com.callstack.react.brownfield.processors.VariantTaskProvider
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.GradleProps
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import org.gradle.api.ProjectConfigurationException
import org.gradle.api.artifacts.Configuration
import org.gradle.api.artifacts.ResolvedArtifact
import org.gradle.api.internal.artifacts.dependencies.DefaultProjectDependency

class ArtifactsResolver(
    private val configurations: MutableCollection<Configuration>,
    private val baseProject: BaseProject,
    private val extension: Extension,
    private val hasExpo: Boolean,
) :
    GradleProps() {
    companion object {
        const val ARTIFACT_TYPE_AAR = "aar"
        const val ARTIFACT_TYPE_JAR = "jar"
    }

    fun processArtifacts() {
        embedDefaultDependencies("implementation")
        setTransitiveToConfigurations()
        generateArtifacts()
    }

    private fun setTransitiveToConfigurations() {
        configurations.forEach {
            if (baseProject.project.extensions.getByType(Extension::class.java).transitive) {
                it.isTransitive = true
            }
        }
    }

    private fun embedExpoDependencies() {
        /**
         * expo project does not exist in example-android-library so doing an
         * early exit.
         */
        if (Utils.isExampleLibrary(baseProject.project.name)) {
            return
        }

        /**
         * The expo third party dependencies are linked to `expo` project.
         * They are linked via `api` configuration and in two ways. In the
         * first way, they are linked as a subProject or local dependencies.
         * In the second way, they are linked as local maven hosted dependencies.
         *
         * We get those dependencies of `expo` project and add those to the consumer
         * library project.
         */
        val expoProject = baseProject.project.rootProject.project("expo")
        val expoConfig = expoProject.configurations.findByName("api")
        expoConfig?.dependencies?.forEach {
            if (extension.resolveLocalDependencies) {
                if (it is DefaultProjectDependency) {
                    val projectDependency =
                        expoProject.dependencies.project(mapOf("path" to ":${it.name}"))
                    baseProject.project.dependencies.add(
                        CONFIG_NAME,
                        projectDependency,
                    )
                } else {
                    baseProject.project.dependencies.add(
                        CONFIG_NAME,
                        it,
                    )
                }
            }
        }
    }

    private fun embedDefaultDependencies(configName: String) {
        if (this.hasExpo) {
            embedExpoDependencies()
        }

        val config = baseProject.project.configurations.findByName(configName)
        val defaultDependencies = config?.dependencies?.filterIsInstance<DefaultProjectDependency>()
        defaultDependencies?.forEach { dependency ->
            if (extension.resolveLocalDependencies) {
                val projectDependency =
                    baseProject.project.dependencies.project(mapOf("path" to ":${dependency.name}"))
                baseProject.project.dependencies.add(
                    CONFIG_NAME,
                    projectDependency,
                )
            }
        }
    }

    private fun generateArtifacts() {
        baseProject.project.extensions.getByType(LibraryExtension::class.java).libraryVariants.all { variant ->
            val artifacts: MutableCollection<ResolvedArtifact> = ArrayList()

            configurations.forEach { configuration ->
                if (isEmbedConfig(configuration, variant)) {
                    val resolvedArtifacts = resolveArtifacts(configuration)
                    artifacts.addAll(resolvedArtifacts)
                    artifacts.addAll(
                        handleUnResolvedArtifacts(
                            configuration,
                            variant,
                            resolvedArtifacts,
                        ),
                    )
                }
            }

            if (artifacts.isNotEmpty()) {
                val processor = VariantProcessor(variant)
                processor.project = baseProject.project
                processor.processVariant(artifacts)
            }
        }
    }

    private fun isEmbedConfig(
        configuration: Configuration,
        variant: LibraryVariant,
    ): Boolean {
        return configuration.name == CONFIG_NAME || configuration.name == variant.buildType.name + CONFIG_SUFFIX ||
            configuration.name == variant.flavorName + CONFIG_SUFFIX ||
            configuration.name == variant.name + CONFIG_SUFFIX
    }

    private fun resolveArtifacts(configuration: Configuration): Collection<ResolvedArtifact> {
        val artifacts = ArrayList<ResolvedArtifact>()
        configuration.resolvedConfiguration.resolvedArtifacts.forEach { artifact ->
            if (artifact.type != ARTIFACT_TYPE_AAR && artifact.type != ARTIFACT_TYPE_JAR) {
                throw ProjectConfigurationException(
                    "Unsupported dependency. Please provide either Aar or Jar dependency",
                    listOf(),
                )
            }
            artifacts.add(artifact)
        }
        return artifacts
    }

    private fun handleUnResolvedArtifacts(
        configuration: Configuration,
        variant: LibraryVariant,
        artifacts: Collection<ResolvedArtifact>,
    ): Collection<ResolvedArtifact> {
        val artifactList = ArrayList<ResolvedArtifact>()
        val unMatchedArtifacts =
            configuration.resolvedConfiguration.firstLevelModuleDependencies.filter {
                !artifacts.any { artifact ->
                    it.moduleName == artifact.moduleVersion.id.name
                }
            }

        val variantHelper = VariantHelper(variant)
        variantHelper.project = baseProject.project
        val variantTaskProvider = VariantTaskProvider(variantHelper)
        variantTaskProvider.project = baseProject.project
        val flavorArtifact = FlavorArtifact(variant, variantTaskProvider)
        flavorArtifact.project = baseProject.project

        unMatchedArtifacts.forEach { dependency ->
            val resolvedArtifact =
                flavorArtifact.createFlavorArtifact(
                    dependency,
                    calculatedValueContainerFactory,
                    fileResolver,
                    taskDependencyFactory,
                )
            artifactList.add(resolvedArtifact)
        }
        return artifactList
    }
}
