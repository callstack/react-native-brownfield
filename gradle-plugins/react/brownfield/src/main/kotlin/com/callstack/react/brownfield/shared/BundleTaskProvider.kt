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
        val androidComponent = project.extensions.findByType(LibraryExtension::class.java)
        // Default to the variant name until a matching build type/flavor refines it.
        var taskName = variant.name

        androidComponent?.buildTypes?.forEach {
            if (it.name == variant.name || it.name == variant.buildType) {
                if (androidComponent.productFlavors.isEmpty()) {
                    taskName = it.name.capitalized()
                    return@forEach
                }

                val flavorNames = androidComponent.productFlavors.map { fl -> fl.name }

                androidComponent.productFlavors.forEach { productFlavor ->
                    handleMissingDimensionStrategies(missingDimensionStrategies, project, flavorNames, productFlavor)
                    val flavorName = missingDimensionStrategies[1]
                    if (productFlavor.name != flavorName) {
                        return@forEach
                    }

                    taskName = "${productFlavor.name.capitalized()}${it.name.capitalized()}"
                    return@forEach
                }
            }
        }
        return variantTaskProvider.bundleTaskProvider(project, taskName)
    }

    private fun handleMissingDimensionStrategies(
        missingDimensionStrategies: List<String>,
        project: Project,
        flavorNames: List<String>,
        productFlavor: LibraryProductFlavor,
    ) {
        if (missingDimensionStrategies.isEmpty()) {
            throw Error(getErrorMessage(project.name))
        }
        val dimension = missingDimensionStrategies[0]
        if (productFlavor.dimension != dimension) {
            throw Error("Ensure the provided dimension matches the ${project.name}'s dimension. Required dimension: $dimension")
        }

        val flavorName = missingDimensionStrategies[1]
        if (!flavorNames.contains(flavorName)) {
            throw Error("Ensure the provided flavor matches the ${project.name}'s flavor. Required flavor(s): $flavorNames")
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
