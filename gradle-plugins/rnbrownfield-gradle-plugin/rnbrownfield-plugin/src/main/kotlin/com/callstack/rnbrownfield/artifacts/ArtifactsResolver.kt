@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.rnbrownfield.artifacts

import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.api.LibraryVariant
import com.callstack.rnbrownfield.plugin.ProjectConfigurations.Companion.CONFIG_NAME
import com.callstack.rnbrownfield.plugin.ProjectConfigurations.Companion.CONFIG_SUFFIX
import com.callstack.rnbrownfield.processors.VariantHelper
import com.callstack.rnbrownfield.processors.VariantProcessor
import com.callstack.rnbrownfield.processors.VariantTaskProvider
import com.callstack.rnbrownfield.shared.BaseProject
import com.callstack.rnbrownfield.shared.GradleProps
import com.callstack.rnbrownfield.utils.Extension
import org.gradle.api.ProjectConfigurationException
import org.gradle.api.artifacts.Configuration
import org.gradle.api.artifacts.ResolvedArtifact
import org.gradle.api.internal.artifacts.dependencies.DefaultProjectDependency

class ArtifactsResolver(
    private val configurations: MutableCollection<Configuration>,
    private val baseProject: BaseProject,
    private val extension: Extension,
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

    private fun embedDefaultDependencies(configName: String) {
        val config = baseProject.project.configurations.findByName(configName)
        val defaultDependencies = config?.dependencies?.filterIsInstance<DefaultProjectDependency>()
        defaultDependencies?.forEach { dependency ->
            if (extension.resolveLocalDependencies) {
                baseProject.project.dependencies.add(
                    CONFIG_NAME,
                    baseProject.project.dependencies.project(mapOf("path" to ":${dependency.name}")),
                )
            }
        }
    }

    private fun generateArtifacts() {
        baseProject.project.extensions.getByType(LibraryExtension::class.java).libraryVariants.all { variant ->
            val artifacts: MutableCollection<ResolvedArtifact> = ArrayList()

            // Process each embed configuration for this variant
            configurations.forEach { configuration ->
                if (isEmbedConfig(configuration, variant)) {
                    // Resolve the artifacts for this configuration
                    val resolvedArtifacts = resolveArtifacts(configuration)
                    artifacts.addAll(resolvedArtifacts)
                    artifacts.addAll(handleUnResolvedArtifacts(configuration, variant, resolvedArtifacts))
                }
            }

            // If artifacts are found, process them using the VariantProcessor
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
            if (artifact.type != ARTIFACT_TYPE_AAR || artifact.type != ARTIFACT_TYPE_JAR) {
                throw ProjectConfigurationException("Unsupported dependency. Please provide either Aar or Jar dependency", listOf())
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
