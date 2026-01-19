package com.callstack.react.brownfield.shared

import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.api.LibraryVariant
import com.callstack.react.brownfield.processors.VariantTaskProvider
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.tasks.TaskProvider

class BundleTaskProvider(private val variantTaskProvider: VariantTaskProvider) {
    fun getBundleTask(
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
                } catch (_: Exception) {}
            }

            bundleTaskProvider != null
        }

        return bundleTaskProvider
    }

}