@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.react.brownfield.processors

import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.api.LibraryVariant
import com.android.build.gradle.tasks.ManifestProcessorTask
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import com.callstack.react.brownfield.utils.capitalized
import groovy.lang.MissingPropertyException
import org.gradle.api.Task
import org.gradle.api.artifacts.ResolvedArtifact
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.tasks.compile.JavaCompile
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths

class VariantHelper(private val variant: LibraryVariant) : BaseProject() {
    private val capitalizedVariantName = variant.name.capitalized()

    fun getVariant(): LibraryVariant {
        return variant
    }

    fun getJavaCompileTask(): JavaCompile {
        return variant.javaCompileProvider.get()
    }

    fun getTaskDependencies(artifact: ResolvedArtifact): Set<Any> {
        return try {
            val publishArtifact =
                artifact::class.members.find { it.name == "publishArtifact" }?.call(artifact)
            val buildDependencies =
                publishArtifact?.javaClass?.getMethod("getBuildDependencies")
                    ?.invoke(publishArtifact)
            @Suppress("UNCHECKED_CAST")
            buildDependencies as? Set<Any> ?: emptySet()
        } catch (ignore: MissingPropertyException) {
            emptySet()
        }
    }

    fun getSyncLibJarsTaskPath(): String {
        return "sync${variant.name.capitalized()}LibJars"
    }

    private fun getClassPathDirFiles(): ConfigurableFileCollection {
        return project.files(
            "$buildDir/intermediates/javac/${variant.name}/compile${
                variant.name.capitalized()
            }JavaWithJavac/classes",
        )
    }

    fun getLocalJarFiles(aarLibraries: Collection<AndroidArchiveLibrary>): Collection<File> {
        return aarLibraries.flatMap {
            it.getLocalJars()
        }
    }

    fun getClassesJarFiles(aarLibraries: Collection<AndroidArchiveLibrary>): List<File> {
        return aarLibraries.map { it.getClassesJarFile() }
    }

    fun classesMergeTaskDoFirst(outputDir: File) {
        val pathsToDelete = mutableListOf<Path>()
        val javacDir = getClassPathDirFiles().first()
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

    fun getLibsDirFile(): File {
        return project.file(
            "$buildDir/intermediates/aar_libs_directory/${variant.name}/sync${
                variant.name.replaceFirstChar(
                    Char::titlecase,
                )
            }LibJars/libs",
        )
    }

    fun getProcessManifest(): ManifestProcessorTask {
        return variant.outputs.first().processManifestProvider.get()
    }

    fun processResources(
        aarLibraries: Collection<AndroidArchiveLibrary>,
        explodeTasks: MutableList<Task>,
    ) {
        val taskPath = "generate${capitalizedVariantName}Resources"
        val resourceGenTask = project.tasks.named(taskPath)

        if (!resourceGenTask.isPresent) {
            throw TaskNotFound("Task $taskPath not found")
        }

        resourceGenTask.configure {
            it.dependsOn(explodeTasks)
        }

        aarLibraries.forEach {
            variant.registerGeneratedResFolders(
                project.files(it.getResDir()),
            )
        }
    }

    fun processAssets(
        aarLibraries: Collection<AndroidArchiveLibrary>,
        explodeTasks: MutableList<Task>,
    ) {
        val assetsTask = variant.mergeAssetsProvider.get()

        assetsTask.dependsOn(explodeTasks)
        val androidExtension = project.extensions.getByName("android") as LibraryExtension
        assetsTask.doFirst {
            val filteredSourceSets = androidExtension.sourceSets.filter { it.name == variant.name }
            filteredSourceSets.forEach { sourceSet ->
                val filteredAarLibs = aarLibraries.filter { it.getAssetsDir().exists() }
                filteredAarLibs.forEach {
                    sourceSet.assets.srcDir(it.getAssetsDir())
                }
            }
        }
    }
}
