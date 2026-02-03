package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import org.gradle.api.file.ConfigurableFileCollection
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

class VariantHelper : BaseProject() {
    private fun getClassPathDirFiles(variantName: String): ConfigurableFileCollection {
        return project.files(
            "$buildDir/intermediates/javac/$variantName/compile${variantName.replaceFirstChar(Char::titlecase)}JavaWithJavac/classes",
        )
    }

    fun classesMergeTaskDoFirst(outputDir: File, variantName: String) {
        val pathsToDelete = mutableListOf<Path>()
        val javacDir = getClassPathDirFiles(variantName).first()
        project.fileTree(outputDir).forEach { path ->
            pathsToDelete.add(Paths.get(outputDir.absolutePath).relativize(Paths.get(path.absolutePath)))
        }
        outputDir.deleteRecursively()
        pathsToDelete.forEach { path ->
            Files.deleteIfExists(Paths.get("$javacDir.absolutePath/$path"))
        }
    }

    fun classesMergeTaskDoLast(
        outputDir: File,
        aarLibraries: Collection<AndroidArchiveLibrary>,
        jarFiles: MutableList<File>,
        variantName: String,
        isMinifyEnabled: Boolean
    ) {
        MergeProcessor.mergeClassesJarIntoClasses(project, aarLibraries, outputDir)
        if (isMinifyEnabled) {
            MergeProcessor.mergeLibsIntoClasses(project, aarLibraries, jarFiles, outputDir)
        }
        val javacDir = getClassPathDirFiles(variantName).first()
        project.copy { copyTask ->
            copyTask.from(outputDir)
            copyTask.into(javacDir)
            copyTask.exclude("META-INF/")
        }

        project.copy { copyTask ->
            copyTask.from("${outputDir.absolutePath}/META-INF")
            copyTask.into(DirectoryManager.getKotlinMetaDirectory(variantName))
            copyTask.include("*.kotlin_module")
        }
    }
}
