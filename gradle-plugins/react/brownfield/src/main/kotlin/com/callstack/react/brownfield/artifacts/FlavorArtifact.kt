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
import com.callstack.react.brownfield.processors.VariantTaskProvider
import com.callstack.react.brownfield.shared.BaseProject
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.artifacts.ResolvedArtifact
import org.gradle.api.artifacts.ResolvedDependency
import org.gradle.api.internal.artifacts.DefaultModuleVersionIdentifier
import org.gradle.api.internal.artifacts.DefaultResolvedArtifact
import org.gradle.api.internal.artifacts.dsl.LazyPublishArtifact
import org.gradle.api.internal.file.FileResolver
import org.gradle.api.internal.tasks.TaskDependencyFactory
import org.gradle.api.tasks.TaskProvider
import org.gradle.api.tasks.bundling.Zip
import org.gradle.internal.Describables
import org.gradle.internal.component.local.model.PublishArtifactLocalArtifactMetadata
import org.gradle.internal.component.model.DefaultIvyArtifactName
import org.gradle.internal.model.CalculatedValueContainerFactory
import java.io.File

class FlavorArtifact(private val variant: LibraryVariant, private val variantTaskProvider: VariantTaskProvider) : BaseProject() {
    fun createFlavorArtifact(
        unResolvedArtifact: ResolvedDependency,
        calculatedValueContainerFactory: CalculatedValueContainerFactory,
        fileResolver: FileResolver,
        taskDependencyFactory: TaskDependencyFactory,
    ): ResolvedArtifact {
        val artifactProject = getArtifactProject(unResolvedArtifact)
        val bundleProvider: TaskProvider<Task>? =
            artifactProject?.let { getBundleTaskProvider(it, variant) }

        val identifier =
            DefaultModuleVersionIdentifier.newId(
                unResolvedArtifact.moduleGroup,
                unResolvedArtifact.moduleName,
                unResolvedArtifact.moduleVersion,
            )
        val artifactFile = createArtifactFile(bundleProvider?.get() as Task)
        val artifactName = DefaultIvyArtifactName(artifactFile.name, "aar", "")

        return DefaultResolvedArtifact(
            PublishArtifactLocalArtifactMetadata(
                { artifactName.name },
                LazyPublishArtifact(bundleProvider, fileResolver, taskDependencyFactory),
            ),
            calculatedValueContainerFactory.create(Describables.of(artifactFile.name), artifactFile),
            identifier,
            artifactName,
        )
    }

    private fun createArtifactFile(bundle: Task): File {
        val packageLibraryProvider = bundle as Zip
        return File(packageLibraryProvider.destinationDirectory.get().asFile, packageLibraryProvider.archiveFileName.get())
    }

    private fun getBundleTaskProvider(
        project: Project,
        variant: LibraryVariant,
    ): TaskProvider<Task>? {
        var bundleTaskProvider: TaskProvider<Task>? = null
        val androidExtension = project.extensions.getByType(LibraryExtension::class.java)

        androidExtension.libraryVariants.find {
            if (it.name == variant.name || it.name == variant.buildType.name) {
                bundleTaskProvider = variantTaskProvider.bundleTaskProvider(project, it.name)
            }

            if (bundleTaskProvider == null) {
                val flavor = if (variant.productFlavors.isEmpty()) variant.mergedFlavor else variant.productFlavors.first()
                try {
                    val missingDimensionStrategies = androidExtension.productFlavors.getByName(flavor.name).missingDimensionStrategies

                    missingDimensionStrategies.entries.find { entry ->
                        val toDimension = entry.key
                        val requestedValues = listOf(entry.value.requested)
                        val toFlavors = requestedValues + entry.value.fallbacks
                        val subFlavor =
                            if (it.productFlavors.isEmpty()) {
                                it.mergedFlavor
                            } else {
                                it.productFlavors.first()
                            }
                        toFlavors.firstOrNull { toFlavor ->
                            val isDimensionEqual = toDimension == subFlavor.dimension
                            val isFlavorEqual = toFlavor == subFlavor.name
                            val isBuildTypeEqual = variant.buildType.name == it.buildType.name
                            if (isDimensionEqual && isFlavorEqual && isBuildTypeEqual) {
                                bundleTaskProvider = variantTaskProvider.bundleTaskProvider(project, it.name)
                            }
                            false
                        } != null
                    } != null
                } catch (ignore: Exception) {
                }
            }

            bundleTaskProvider != null
        }

        return bundleTaskProvider
    }

    private fun getArtifactProject(unResolvedArtifact: ResolvedDependency): Project? {
        return project.rootProject.allprojects.find { p ->
            unResolvedArtifact.moduleName == p.name && unResolvedArtifact.moduleGroup == p.group.toString()
        }
    }
}
