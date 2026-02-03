package com.callstack.react.brownfield.processors

import com.android.build.gradle.internal.tasks.factory.dependsOn
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.shared.BaseProject

class VariantProcessor : BaseProject() {
    fun processVariant(variantName: String) {
        val capitalizedVariantName = variantName.replaceFirstChar(Char::titlecase)
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
