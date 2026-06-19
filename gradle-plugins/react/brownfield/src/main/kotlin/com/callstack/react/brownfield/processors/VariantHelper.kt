package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.file.ConfigurableFileCollection
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream

class VariantHelper : BaseProject() {
    private fun getClassPathDirFiles(variantName: String): ConfigurableFileCollection {
        return project.files(
            "$buildDir/intermediates/javac/$variantName/compile${variantName.capitalized()}JavaWithJavac/classes",
        )
    }

    fun classesMergeTaskDoFirst(
        outputDir: File,
        variantName: String,
    ) {
        val pathsToDelete = mutableListOf<Path>()
        val javacDir = getClassPathDirFiles(variantName).first()
        project.fileTree(outputDir).forEach { path ->
            pathsToDelete.add(
                Paths.get(outputDir.absolutePath).relativize(Paths.get(path.absolutePath)),
            )
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
        isMinifyEnabled: Boolean,
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

        syncMergedKotlinMetadata(variantName)
    }

    fun syncMergedKotlinMetadata(variantName: String) {
        val mergeMetaDir = File(DirectoryManager.getMergeClassDirectory(variantName), "META-INF")
        if (!mergeMetaDir.exists()) {
            return
        }

        val destinations =
            listOf(
                DirectoryManager.getKotlinMetaDirectory(variantName),
                DirectoryManager.getJavaResMetaDirectory(variantName),
            )

        destinations.forEach { destination ->
            destination.mkdirs()
            project.copy { copyTask ->
                copyTask.from(mergeMetaDir)
                copyTask.into(destination)
                copyTask.include("*.kotlin_module")
            }
        }
    }

    fun syncMergedKotlinMetadataIntoClassesJar(variantName: String) {
        val mergeMetaDir = File(DirectoryManager.getMergeClassDirectory(variantName), "META-INF")
        val classesJar = DirectoryManager.getAarMainJarClassesJar(variantName)

        if (!mergeMetaDir.exists() || !classesJar.exists()) {
            return
        }

        val kotlinModuleFiles =
            mergeMetaDir.listFiles { file -> file.isFile && file.extension == "kotlin_module" }
                ?.sortedBy { it.name }
                .orEmpty()

        if (kotlinModuleFiles.isEmpty()) {
            return
        }

        val replacementEntries = kotlinModuleFiles.associateBy { "META-INF/${it.name}" }
        val tempJar = File(classesJar.parentFile, "${classesJar.name}.tmp")

        ZipInputStream(FileInputStream(classesJar)).use { input ->
            ZipOutputStream(FileOutputStream(tempJar)).use { output ->
                generateSequence { input.nextEntry }
                    .forEach { entry ->
                        if (entry.name !in replacementEntries) {
                            output.putNextEntry(ZipEntry(entry.name).apply { time = entry.time })
                            input.copyTo(output)
                            output.closeEntry()
                        }
                        input.closeEntry()
                    }

                kotlinModuleFiles.forEach { file ->
                    output.putNextEntry(ZipEntry("META-INF/${file.name}"))
                    file.inputStream().use { metadataInput ->
                        metadataInput.copyTo(output)
                    }
                    output.closeEntry()
                }
            }
        }

        if (!tempJar.renameTo(classesJar)) {
            tempJar.copyTo(classesJar, overwrite = true)
            tempJar.delete()
        }
    }
}
