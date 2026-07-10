package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.shared.ExplodeAarTask
import com.callstack.react.brownfield.utils.Utils
import org.gradle.api.Project
import org.gradle.api.tasks.TaskProvider
import java.io.File

class ProguardProcessor(val project: Project) {
    fun processFiles(
        proguardRules: List<File>,
        capitalizedVariantName: String,
        explodeTask: TaskProvider<ExplodeAarTask>,
    ) {
        val mergeTaskName = "merge${capitalizedVariantName}ConsumerProguardFiles"
        project.tasks.matching { it.name == mergeTaskName }.configureEach { task ->
            task.dependsOn(explodeTask)
            task.doLast {
                val outputFile = task.outputs.files.singleFile
                Utils.mergeFiles(proguardRules, outputFile)
            }
        }
    }
}
