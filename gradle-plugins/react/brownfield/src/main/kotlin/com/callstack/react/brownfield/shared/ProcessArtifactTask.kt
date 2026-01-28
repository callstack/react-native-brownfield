package com.callstack.react.brownfield.shared

import com.callstack.react.brownfield.artifacts.ArtifactsResolver
import kotlinx.serialization.encodeToString
import org.gradle.api.DefaultTask
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Internal
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.TaskAction

abstract class ProcessArtifactsTask: DefaultTask() {

    @get:OutputFile
    abstract val outputFile: RegularFileProperty

    @get:OutputFile
    abstract val artifactOutput: RegularFileProperty

    @TaskAction
    fun run() {
        val artifacts = artifactsResolver.get().processArtifacts()
        val metaList = mutableListOf<String>()
        artifacts.forEach {
            metaList.add("${it.moduleName},${it.bundleTaskName}")
        }
        outputFile.get().asFile.writeText(metaList.joinToString("\n"))
        artifactOutput.get().asFile.writeText(
            artifacts.joinToString("\n") {
                JsonInstance.json.encodeToString(it)
            }
        )
    }

    @get:Internal
    abstract val artifactsResolver: Property<ArtifactsResolver>
}