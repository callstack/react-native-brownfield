@file:Suppress("DEPRECATION")

package com.callstack.react.brownfield.shared

import com.callstack.react.brownfield.processors.VariantTaskProvider
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.tasks.TaskProvider

class BundleTaskProvider(private val variantTaskProvider: VariantTaskProvider) {
    fun getBundleTask(
        project: Project,
        variantName: String,
        buildType: String,
        productFlavors: List<Pair<String, String>>,
    ): TaskProvider<Task>? {
        val directMatch = runCatching { variantTaskProvider.bundleTaskProvider(project, variantName) }.getOrNull()
        if (directMatch != null) {
            return directMatch
        }

        val buildTypeMatch = runCatching { variantTaskProvider.bundleTaskProvider(project, buildType) }.getOrNull()
        if (buildTypeMatch != null) {
            return buildTypeMatch
        }

        for ((_, selectedFlavor) in productFlavors) {
            val fallbackVariantName = "$selectedFlavor${buildType.replaceFirstChar(Char::titlecase)}"
            val fallback = runCatching { variantTaskProvider.bundleTaskProvider(project, fallbackVariantName) }.getOrNull()
            if (fallback != null) return fallback
        }

        return null
    }
}
