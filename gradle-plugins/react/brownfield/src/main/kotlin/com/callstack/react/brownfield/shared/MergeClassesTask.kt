package com.callstack.react.brownfield.shared

import com.callstack.react.brownfield.processors.MergeProcessor
import com.callstack.react.brownfield.utils.DirectoryManager
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.DefaultTask
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Classpath
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.TaskAction
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

abstract class MergeClassesTask : DefaultTask() {
    @get:Classpath
    abstract val inputClassesJars: ConfigurableFileCollection

    @get:Input
    abstract val variantName: Property<String>

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @TaskAction
    fun run() {
        val resolvedVariantName = variantName.get()
        val mergedOutputDir = outputDir.get().asFile
        val javacDir = getClassPathDir(resolvedVariantName)
        val pathsToDelete = mutableListOf<Path>()

        if (mergedOutputDir.exists()) {
            project.fileTree(mergedOutputDir).forEach { path ->
                pathsToDelete.add(
                    Paths.get(mergedOutputDir.absolutePath).relativize(Paths.get(path.absolutePath)),
                )
            }
        }

        mergedOutputDir.deleteRecursively()
        pathsToDelete.forEach { path ->
            Files.deleteIfExists(javacDir.toPath().resolve(path))
        }

        MergeProcessor.mergeClassesJarFilesIntoClasses(project, inputClassesJars.files, mergedOutputDir)

        project.copy { copyTask ->
            copyTask.from(mergedOutputDir)
            copyTask.into(javacDir)
            copyTask.exclude("META-INF/")
        }

        project.copy { copyTask ->
            copyTask.from(File(mergedOutputDir, "META-INF"))
            copyTask.into(DirectoryManager.getKotlinMetaDirectory(resolvedVariantName))
            copyTask.include("*.kotlin_module")
        }
    }

    private fun getClassPathDir(variantName: String): File {
        val buildDirectory = project.layout.buildDirectory.get().asFile
        return project.file(
            "$buildDirectory/intermediates/javac/$variantName/compile${variantName.capitalized()}JavaWithJavac/classes",
        )
    }
}
