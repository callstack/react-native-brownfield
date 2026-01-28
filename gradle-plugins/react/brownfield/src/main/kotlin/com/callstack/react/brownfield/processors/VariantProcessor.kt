@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.react.brownfield.processors

import com.android.build.gradle.api.LibraryVariant
import com.android.build.gradle.internal.tasks.factory.dependsOn
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.shared.BaseProject

class VariantProcessor : BaseProject() {
    fun processVariant(variant: LibraryVariant) {
        val capitalizedVariantName = variant.name.replaceFirstChar(Char::titlecase)
        val preBuildTaskPath = "pre${capitalizedVariantName}Build"
        val prepareTask = project.tasks.named(preBuildTaskPath)

        if (!prepareTask.isPresent) {
            throw TaskNotFound("Can not find $preBuildTaskPath task")
        }

        if (capitalizedVariantName.contains("Release")) {
            prepareTask.dependsOn(":app:createBundle${capitalizedVariantName}JsAndAssets")
        }
    }
}
