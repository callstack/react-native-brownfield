@file:Suppress("DEPRECATION")

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
        val androidExtension = project.extensions.getByType(LibraryExtension::class.java)

        // Find the first variant in the library that matches our criteria
        val matchedVariant =
            androidExtension.libraryVariants.find { libraryVariant ->
                // 1. Try Simple Match
                if (libraryVariant.name == variant.name || libraryVariant.name == variant.buildType.name) {
                    return@find true
                }

                // 2. Try Dimension Strategy Match
                val flavor = variant.productFlavors.firstOrNull() ?: variant.mergedFlavor
                val strategies =
                    runCatching {
                        androidExtension.productFlavors.getByName(flavor.name).missingDimensionStrategies
                    }.getOrNull() ?: return@find false

                strategies.any { (dimension, strategy) ->
                    val fallbacks = listOf(strategy.requested) + strategy.fallbacks
                    val libFlavor = libraryVariant.productFlavors.firstOrNull() ?: libraryVariant.mergedFlavor

                    dimension == libFlavor.dimension &&
                        fallbacks.contains(libFlavor.name) &&
                        variant.buildType.name == libraryVariant.buildType.name
                }
            }

        return matchedVariant?.let { variantTaskProvider.bundleTaskProvider(project, it.name) }
    }
}
