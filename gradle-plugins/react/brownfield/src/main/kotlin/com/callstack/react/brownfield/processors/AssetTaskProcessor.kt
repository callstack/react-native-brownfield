package com.callstack.react.brownfield.processors

import com.android.build.api.variant.LibraryVariant
import com.callstack.react.brownfield.shared.ExplodeAarTask
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.DefaultTask
import org.gradle.api.Project
import org.gradle.api.file.ConfigurableFileCollection
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.tasks.CacheableTask
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskAction
import org.gradle.api.tasks.TaskProvider

@CacheableTask
abstract class CopyExplodedAssetsTask : DefaultTask() {
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val inputAssetDirs: ConfigurableFileCollection

    @get:OutputDirectory
    abstract val outputDirectory: DirectoryProperty

    @TaskAction
    fun run() {
        val out = outputDirectory.get().asFile
        out.deleteRecursively()
        out.mkdirs()
        inputAssetDirs.forEach { assetDir ->
            if (assetDir.exists()) {
                assetDir.copyRecursively(out, overwrite = true)
            }
        }
    }
}

object AssetTaskProcessor {
    fun process(
        project: Project,
        variant: LibraryVariant,
        aarLibraries: List<AndroidArchiveLibrary>,
        explodeTask: TaskProvider<ExplodeAarTask>,
    ) {
        val capitalized = variant.name.capitalized()
        val assetDirs = aarLibraries.map { it.getAssetsDir() }
        val copyAssetsTask =
            project.tasks.register(
                "copyExplodedAssetsFor$capitalized",
                CopyExplodedAssetsTask::class.java,
            ) { task ->
                task.inputAssetDirs.setFrom(assetDirs)
                task.dependsOn(explodeTask)
            }

        variant.sources.assets?.addGeneratedSourceDirectory(
            copyAssetsTask,
            CopyExplodedAssetsTask::outputDirectory,
        )
    }
}
