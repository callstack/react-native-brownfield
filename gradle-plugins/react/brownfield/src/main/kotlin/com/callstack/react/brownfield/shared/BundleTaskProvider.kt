@file:Suppress("DEPRECATION")

package com.callstack.react.brownfield.shared

import com.android.build.api.dsl.LibraryExtension
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
    ): TaskProvider<Task> {
        val androidComponent = project.extensions.findByType(LibraryExtension::class.java)
        // TODO: evaluate if default makes sense
        var taskName = variant.name

        androidComponent?.buildTypes?.forEach {
            if (it.name == variant.name || it.name == variant.buildType) {
                if (androidComponent.productFlavors.isEmpty()) {
                    taskName = it.name.capitalized()
                    return@forEach
                }

                androidComponent.productFlavors.forEach { productFlavor ->
                    taskName = "${productFlavor.name.capitalized()}${it.name.capitalized()}"
                    return@forEach
                }
            }

        }
        return variantTaskProvider.bundleTaskProvider(project, taskName)
    }
}
