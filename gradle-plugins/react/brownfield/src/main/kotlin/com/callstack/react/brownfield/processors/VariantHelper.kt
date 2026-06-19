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
        val mergeClassesDir = DirectoryManager.getMergeClassDirectory(variantName)
        val classesJar = DirectoryManager.getAarMainJarClassesJar(variantName)

        if (!mergeClassesDir.exists() || !classesJar.exists()) {
            return
        }

        val replacementEntries =
            mergeClassesDir.walkTopDown()
                .filter { it.isFile }
                .associateBy { file ->
                    mergeClassesDir.toPath().relativize(file.toPath()).toString().replace(File.separatorChar, '/')
                }

        if (replacementEntries.isEmpty()) {
            return
        }

        val tempJar = File(classesJar.parentFile, "${classesJar.name}.tmp")

        rewriteClassesJarWithMergedEntries(
            classesJar = classesJar,
            tempJar = tempJar,
            replacementEntries = replacementEntries,
        )

        if (!tempJar.renameTo(classesJar)) {
            tempJar.copyTo(classesJar, overwrite = true)
            tempJar.delete()
        }
    }

    private fun rewriteClassesJarWithMergedEntries(
        classesJar: File,
        tempJar: File,
        replacementEntries: Map<String, File>,
    ) {
        ZipInputStream(FileInputStream(classesJar)).use { input ->
            ZipOutputStream(FileOutputStream(tempJar)).use { output ->
                copyExistingEntries(input, output, replacementEntries)
                writeReplacementEntries(output, replacementEntries)
            }
        }
    }

    private fun copyExistingEntries(
        input: ZipInputStream,
        output: ZipOutputStream,
        replacementEntries: Map<String, File>,
    ) {
        generateSequence { input.nextEntry }
            .forEach { entry ->
                if (entry.name !in replacementEntries) {
                    copyZipEntry(input, output, entry)
                }
                input.closeEntry()
            }
    }

    private fun copyZipEntry(
        input: ZipInputStream,
        output: ZipOutputStream,
        entry: ZipEntry,
    ) {
        output.putNextEntry(ZipEntry(entry.name).apply { time = entry.time })
        input.copyTo(output)
        output.closeEntry()
    }

    private fun writeReplacementEntries(
        output: ZipOutputStream,
        replacementEntries: Map<String, File>,
    ) {
        replacementEntries.toSortedMap().forEach { (entryName, file) ->
            output.putNextEntry(ZipEntry(entryName))
            file.inputStream().use { replacementInput ->
                replacementInput.copyTo(output)
            }
            output.closeEntry()
        }
    }
}
