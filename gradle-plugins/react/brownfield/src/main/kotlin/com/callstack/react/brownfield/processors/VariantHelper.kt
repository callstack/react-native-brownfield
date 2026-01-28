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
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import org.gradle.api.file.ConfigurableFileCollection
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

class VariantHelper(private val variant: LibraryVariant) : BaseProject() {
    private fun getClassPathDirFiles(): ConfigurableFileCollection {
        return project.files(
            "$buildDir/intermediates/javac/${variant.name}/compile${variant.name.replaceFirstChar(Char::titlecase)}JavaWithJavac/classes",
        )
    }

    fun classesMergeTaskDoFirst(outputDir: File) {
        val pathsToDelete = mutableListOf<Path>()
        val javacDir = getClassPathDirFiles().first()
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
    ) {
        MergeProcessor.mergeClassesJarIntoClasses(project, aarLibraries, outputDir)
        if (variant.buildType.isMinifyEnabled) {
            MergeProcessor.mergeLibsIntoClasses(project, aarLibraries, jarFiles, outputDir)
        }
        val javacDir = getClassPathDirFiles().first()
        project.copy { copyTask ->
            copyTask.from(outputDir)
            copyTask.into(javacDir)
            copyTask.exclude("META-INF/")
        }

        project.copy { copyTask ->
            copyTask.from("${outputDir.absolutePath}/META-INF")
            copyTask.into(DirectoryManager.getKotlinMetaDirectory(variant))
            copyTask.include("*.kotlin_module")
        }
    }
}
