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
import com.callstack.react.brownfield.processors.VariantProcessor
import com.callstack.react.brownfield.processors.VariantTaskProvider
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.BundleTaskProvider
import com.callstack.react.brownfield.shared.GradleProps
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import org.gradle.api.Project
import org.gradle.api.artifacts.Configuration
import org.gradle.api.artifacts.component.ModuleComponentIdentifier
import org.gradle.api.artifacts.component.ProjectComponentIdentifier
import org.gradle.api.artifacts.result.ResolvedDependencyResult
import org.gradle.api.internal.artifacts.dependencies.DefaultProjectDependency
import org.gradle.internal.component.local.model.PublishArtifactLocalArtifactMetadata
import kotlin.collections.mutableListOf


class ArtifactsResolver(
    private val configurations: MutableCollection<Configuration>,
    private val baseProject: BaseProject,
    private val extension: Extension,
) :
    GradleProps() {
    fun processDefaultDependencies() {
        embedDefaultDependencies("implementation")
    }

    fun processArtifacts(): MutableList<UnresolvedArtifactInfo> {
        return generateArtifacts()
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
                        baseProject.project.dependencies.add(
                            CONFIG_NAME,
                            expoProject.dependencies.project(mapOf("path" to ":${it.name}")),
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
        if (extension.isExpo) {
            embedExpoDependencies()
        }

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

    private fun generateArtifacts(): MutableList<UnresolvedArtifactInfo> {
        // store the artifacts which can be variant aware including flavors
        val artifacts = mutableSetOf<UnresolvedArtifactInfo>()
        baseProject.project.extensions.getByType(LibraryExtension::class.java).libraryVariants.all { variant ->

            configurations.forEach { configuration ->
                if (isEmbedConfig(configuration, variant)) {
                    val res = handleUnResolvedArtifacts(configuration, variant)
                    artifacts.addAll(res)
                }
            }

            if (artifacts.isNotEmpty()) {
                val processor = VariantProcessor()
                processor.project = baseProject.project
                processor.processVariant(variant.name)
            }
        }

        return artifacts.toMutableList()
    }

    private fun isEmbedConfig(
        configuration: Configuration,
        variant: LibraryVariant,
    ): Boolean {
        return configuration.name == CONFIG_NAME || configuration.name == variant.buildType.name + CONFIG_SUFFIX ||
            configuration.name == variant.flavorName + CONFIG_SUFFIX ||
            configuration.name == variant.name + CONFIG_SUFFIX
    }

    private fun handleUnResolvedArtifacts(
        configuration: Configuration,
        variant: LibraryVariant,
    ): List<UnresolvedArtifactInfo> {
        val unMatchedArtifacts = mutableListOf<UnresolvedArtifactInfo>()
        val firstLevelIds = setOf<String>()

        val resolutionResult = configuration.incoming.resolutionResult
        resolutionResult.root.dependencies.forEach {
            if (it is ResolvedDependencyResult) {
                when (val id = it.selected.id) {
                    is ModuleComponentIdentifier -> {
//                        println("===----- module ${id.moduleIdentifier.name} ${id.displayName} ")
                        if (id.displayName !in firstLevelIds) {
//                            unMatchedArtifacts.add(
//                                UnresolvedArtifactInfo(
//                                    id.group,
//                                    id.module,
//                                    id.version,
//                                )
//                            )
                        }
                    }
                    is ProjectComponentIdentifier -> {
                        val depProj = baseProject.project.project(id.projectPath)
                        if (id.displayName !in firstLevelIds) {
                            unMatchedArtifacts.add(UnresolvedArtifactInfo(
                                depProj.group.toString(),
                                depProj.name,
                                depProj.version.toString(),
                                baseProject.project.file(id.projectName).absolutePath,
                                mutableSetOf(),
                                null,
                            ))
                        }
                    }
                }
            }
        }

        val variantTaskProvider = VariantTaskProvider()
        variantTaskProvider.project = baseProject.project
        val flavorArtifact = FlavorArtifact(configuration)
        flavorArtifact.project = baseProject.project

        val bundleTaskProvider = BundleTaskProvider(variantTaskProvider)

        val unMatchedArtifacts1 = mutableListOf<UnresolvedArtifactInfo>()
        unMatchedArtifacts.forEach { artifact ->
            val artifactProject = getArtifactProject(artifact)
            val bundleProvider = artifactProject?.let { bundleTaskProvider.getBundleTask(it, variant) }

            val resolvedArtifact =
                flavorArtifact.createFlavorArtifact(
                    fileResolver,
                    taskDependencyFactory,
                    bundleProvider,
                    variant.name
                )

            when (val asd = resolvedArtifact.id) {
                is PublishArtifactLocalArtifactMetadata -> {
                    val deps = asd.buildDependencies.getDependencies(null)
                    unMatchedArtifacts1.add(UnresolvedArtifactInfo(
                        artifact.moduleGroup,
                        artifact.moduleName,
                        artifact.moduleVersion,
                        resolvedArtifact.file.absolutePath,
                        deps.map { it.path }.toSet(),
                        bundleProvider?.name,
                    ))
                }
            }
        }

        return unMatchedArtifacts1
    }


    private fun getArtifactProject(unResolvedArtifact: UnresolvedArtifactInfo): Project? {
        return baseProject.project.rootProject.allprojects.find { p ->
            unResolvedArtifact.moduleName == p.name && unResolvedArtifact.moduleGroup == p.group.toString()
        }
    }
}
