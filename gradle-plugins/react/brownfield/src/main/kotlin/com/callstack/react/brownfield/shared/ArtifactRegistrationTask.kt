package com.callstack.react.brownfield.shared

import com.callstack.react.brownfield.artifacts.ArtifactsResolver
import org.gradle.api.DefaultTask
import org.gradle.api.artifacts.Configuration
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.InputFile
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.Internal
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.TaskAction
import java.io.File

abstract class ArtifactRegistrationTask: DefaultTask() {

    @get:Internal
    abstract val inputArtifacts: ListProperty<UnresolvedArtifactInfo>

    @get:InputFile
    abstract val inputFile: RegularFileProperty

    @TaskAction
    fun run() {
        println("=== ArtifactRegistrationTask ===")
        val lines = inputFile.get().asFile.readLines()

        lines.forEach { line ->
            println("==== Line $line")
            val lineSplits = line.split(",")
            println("=== splits -- $lineSplits")
            val projectPath = lineSplits[0]
            val taskName = lineSplits[1]
            println("=== proj name $projectPath")
            val task = project.rootProject.project(projectPath).tasks.findByName(taskName)
            if (task != null) {
                println("Executing $line")
                task.actions.forEach { action ->
                    action.execute(task)
                }
            } else {
                println("Task $line not found")
            }
        }

//        project.gradle.taskGraph.whenReady { graph ->
//            lines.forEach { name ->
//                val task = project.tasks.findByName(name)
//                if (task != null) {
//                    if (!graph.hasTask(task)) {
//                        println("Enqueueing task: $name")
//                        task.actions.forEach { action -> action.execute(task) }
//                    } else {
//                        println("Task $name is already in the graph, skipping manual execution")
//                    }
//                } else {
//                    println("Task $name not found")
//                }
//            }
//        }

//        inputArtifacts.get().forEach {
//            println("====== From artifact reg task ${it.moduleName} - ${it.moduleGroup} - ${it.file.absolutePath}")
//        }
    }
}