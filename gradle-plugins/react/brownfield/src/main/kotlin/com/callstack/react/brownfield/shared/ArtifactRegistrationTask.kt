package com.callstack.react.brownfield.shared

import com.callstack.react.brownfield.artifacts.ArtifactsResolver
import org.gradle.api.DefaultTask
import org.gradle.api.artifacts.Configuration
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.TaskAction
import java.io.File

abstract class ProcessArtifactsTask: DefaultTask() {

    @get:OutputFile
    val outputArtifacts: ListProperty<UnresolvedArtifactInfo> = project.objects.listProperty(UnresolvedArtifactInfo::class.java)

    @InputFiles
    val artifactsResolver: Property<ArtifactsResolver> = project.objects.property(ArtifactsResolver::class.java)


    @TaskAction
    fun run() {
        println("=== ProcessArtifactsTask ===")
        artifactsResolver.get().processDefaultDependencies()
    }
}