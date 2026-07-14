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
abstract class CopyExplodedResTask : DefaultTask() {
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val inputResDirs: ConfigurableFileCollection

    @get:OutputDirectory
    abstract val outputDirectory: DirectoryProperty

    @TaskAction
    fun run() {
        val out = outputDirectory.get().asFile
        out.deleteRecursively()
        out.mkdirs()
        inputResDirs.forEach { resDir ->
            if (resDir.exists()) {
                resDir.copyRecursively(out, overwrite = true)
            }
        }
    }
}

object ResourceTaskProcessor {
    fun process(
        project: Project,
        variant: LibraryVariant,
        aarLibraries: List<AndroidArchiveLibrary>,
        explodeTask: TaskProvider<ExplodeAarTask>,
    ) {
        val capitalized = variant.name.capitalized()
        val resDirs = aarLibraries.map { it.getResDir() }
        val copyResTask =
            project.tasks.register(
                "copyExplodedResFor$capitalized",
                CopyExplodedResTask::class.java,
            ) { task ->
                task.inputResDirs.setFrom(resDirs)
                task.dependsOn(explodeTask)
            }

        variant.sources.res?.addGeneratedSourceDirectory(
            copyResTask,
            CopyExplodedResTask::outputDirectory,
        )
    }
}
