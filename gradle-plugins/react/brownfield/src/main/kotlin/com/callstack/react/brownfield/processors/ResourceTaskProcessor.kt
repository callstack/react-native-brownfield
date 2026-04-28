package com.callstack.react.brownfield.processors

import com.android.build.gradle.api.LibraryVariant
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project

object ResourceTaskProcessor {
    fun process(
        variant: LibraryVariant,
        project: Project,
        aarLibraries: List<AndroidArchiveLibrary>,
    ) {
        val taskPath = "generate${variant.name.capitalized()}Resources"
        val resourceGenTask = project.tasks.named(taskPath)

        if (!resourceGenTask.isPresent) {
            throw TaskNotFound("Task $taskPath not found")
        }

        variant.registerGeneratedResFolders(
            project.files(aarLibraries.map { it.getResDir() }),
        )
    }
}
