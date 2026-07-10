package com.callstack.react.brownfield.shared

import com.android.build.api.dsl.LibraryExtension
import com.android.build.api.dsl.LibraryProductFlavor
import com.android.build.api.variant.LibraryVariant
import com.callstack.react.brownfield.processors.VariantTaskProvider
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.tasks.TaskProvider

class BundleTaskProvider(private val variantTaskProvider: VariantTaskProvider) {
    fun getBundleTask(
        project: Project,
        variant: LibraryVariant,
        missingDimensionStrategies: List<String>,
    ): TaskProvider<Task> {
        val taskName = resolveTaskName(project, variant, missingDimensionStrategies)
        return variantTaskProvider.bundleTaskProvider(project, taskName)
    }

    private fun resolveTaskName(
        project: Project,
        variant: LibraryVariant,
        missingDimensionStrategies: List<String>,
    ): String {
        val androidComponent = project.extensions.findByType(LibraryExtension::class.java) ?: return variant.name

        for (buildType in androidComponent.buildTypes) {
            if (buildType.name != variant.name && buildType.name != variant.buildType) {
                continue
            }

            if (androidComponent.productFlavors.isEmpty()) {
                return buildType.name.capitalized()
            }

            val flavorNames = androidComponent.productFlavors.map { fl -> fl.name }
            for (productFlavor in androidComponent.productFlavors) {
                handleMissingDimensionStrategies(missingDimensionStrategies, project, flavorNames, productFlavor)
                val flavorName = missingDimensionStrategies[1]
                if (productFlavor.name != flavorName) {
                    continue
                }

                return "${productFlavor.name.capitalized()}${buildType.name.capitalized()}"
            }
        }

        return variant.name
    }

    private fun handleMissingDimensionStrategies(
        missingDimensionStrategies: List<String>,
        project: Project,
        flavorNames: List<String>,
        productFlavor: LibraryProductFlavor,
    ) {
        if (missingDimensionStrategies.isEmpty()) {
            throw MissingDimensionStrategiesException(getErrorMessage(project.name))
        }

        val dimension = missingDimensionStrategies[0]
        if (productFlavor.dimension != dimension) {
            throw DimensionMismatchException(
                "Ensure the provided dimension matches the ${project.name}'s dimension. Required dimension: $dimension",
            )
        }

        val flavorName = missingDimensionStrategies[1]
        if (!flavorNames.contains(flavorName)) {
            throw FlavorMismatchException(
                "Ensure the provided flavor matches the ${project.name}'s flavor. Required flavor(s): $flavorNames",
            )
        }
    }

    private fun getErrorMessage(projectName: String): String {
        return """
            Provide `missingDimensionStrategies` for $projectName:
            If using Expo, provide the `android.expo.missingDimensionStrategies` property from Brownfield Config.
            If using Bare React Native, provide the `reactBrownfield.missingDimensionStrategies` property.
            """.trimIndent()
    }
}

class MissingDimensionStrategiesException(message: String) : IllegalStateException(message)

class DimensionMismatchException(message: String) : IllegalArgumentException(message)

class FlavorMismatchException(message: String) : IllegalArgumentException(message)
