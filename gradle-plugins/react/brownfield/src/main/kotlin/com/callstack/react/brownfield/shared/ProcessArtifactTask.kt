package com.callstack.react.brownfield.shared

import com.callstack.react.brownfield.artifacts.ArtifactsResolver
import kotlinx.serialization.encodeToString
import org.gradle.api.DefaultTask
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.Internal
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.TaskAction

abstract class ProcessArtifactsTask: DefaultTask() {

    @get:OutputFile
    abstract val outputFile: RegularFileProperty

    @get:OutputFile
    abstract val artifactOutput: RegularFileProperty

    @get:Internal
    abstract var artifactsList: ListProperty<UnresolvedArtifactInfo>


    @TaskAction
    fun run() {
        println("=== ProcessArtifactsTask ===")
        val artifacts = artifactsResolver.get().processArtifacts()
        val metaList = mutableListOf<String>()
        artifacts.forEach {
//            if (it.bundleTaskName?.contains("Release") == true) {
//                metaList.add("${it.moduleName},${it.bundleTaskName}")
//            }
            metaList.add("${it.moduleName},${it.bundleTaskName}")
        }
        outputFile.get().asFile.writeText(metaList.joinToString("\n"))
        artifactOutput.get().asFile.writeText(
            artifacts.joinToString("\n") {
                JsonInstance.json.encodeToString(it)
            }
        )
//        artifactOutput.get().asFile.writeText(artifacts.joinToString("\n") { it.toString() })
    }

    @get:Internal
    abstract val artifactsResolver: Property<ArtifactsResolver>

}