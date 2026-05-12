package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.shared.ExplodeAarTask
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project
import org.gradle.api.Task
import org.gradle.api.UnknownTaskException
import org.gradle.api.tasks.TaskProvider
import java.io.File

class VariantTaskProvider(val project: Project) {
    fun bundleTaskProvider(
        project: Project,
        variantName: String,
    ): TaskProvider<Task> {
        val capitalizedVariantName = variantName.capitalized()
        val candidates = listOf(
            "bundle${capitalizedVariantName}Aar",
            "bundle${capitalizedVariantName}",
            "package${capitalizedVariantName}Aar",
            "assemble${capitalizedVariantName}",
        )

        candidates.forEach { taskName ->
            val task = project.tasks.findByName(taskName)
            if (task != null) {
                return project.tasks.named(task.name)
            }
        }

        project.logger.warn(
            "Brownfield: no bundle task found for variant '$variantName' in project '${project.path}' " +
                "(tried ${candidates.joinToString()}). Falling back to no-op bundle hook.",
        )
        return fallbackNoOpBundleTask(project, capitalizedVariantName)
    }

    fun processDataBinding(
        bundleTask: TaskProvider<Task>,
        aarLibraries: Collection<AndroidArchiveLibrary>,
        variantName: String,
    ) {
        bundleTask.configure { task ->
            task.doLast {
                aarLibraries.forEach {
                    val dataBindingFolder = it.getDataBindingFolder()
                    if (dataBindingFolder.exists()) {
                        val filePath = getReBundleFilePath(dataBindingFolder.name, variantName)
                        File(filePath).mkdirs()
                        project.copy { copyTask ->
                            copyTask.from(dataBindingFolder)
                            copyTask.into(filePath)
                        }
                    }

                    val dataBindingLogFolder = it.getDataBindingLogFolder()
                    if (dataBindingLogFolder.exists()) {
                        val filePath = getReBundleFilePath(dataBindingLogFolder.name, variantName)
                        File(filePath).mkdirs()
                        project.copy { copyTask ->
                            copyTask.from(dataBindingLogFolder)
                            copyTask.into(filePath)
                        }
                    }
                }
            }
        }
    }

    private fun getReBundleFilePath(
        folderName: String,
        variantName: String,
    ) = "${DirectoryManager.getReBundleDirectory(
        variantName,
    ).path}/$folderName"

    fun preBuildTaskByVariant(
        capitalizedVariantName: String,
        explodeAarTask: TaskProvider<ExplodeAarTask>,
    ) {
        val hookTask = hookTaskByVariant(capitalizedVariantName) ?: run {
            project.logger.warn(
                "Could not find a hook task for variant $capitalizedVariantName " +
                    "(tried pre/build/assemble/bundle task names). Skipping explodeAar wiring.",
            )
            return
        }

        hookTask.configure { it.dependsOn(explodeAarTask) }
        if (capitalizedVariantName.contains("Release")) {
            val projectExt = project.extensions.getByType(Extension::class.java)
            val appProject = project.rootProject.project(projectExt.appProjectName)
            hookTask.configure { it.dependsOn("${appProject.path}:createBundle${capitalizedVariantName}JsAndAssets") }
        }
    }

    private fun hookTaskByVariant(capitalizedVariantName: String): TaskProvider<Task>? {
        val candidates = listOf(
            "pre${capitalizedVariantName}Build",
            "assemble$capitalizedVariantName",
            "bundle${capitalizedVariantName}Aar",
            "bundle${capitalizedVariantName}",
        )

        candidates.forEach { taskName ->
            try {
                return project.tasks.named(taskName)
            } catch (_: UnknownTaskException) {
                // Try the next candidate task name.
            }
        }

        return null
    }

    private fun fallbackNoOpBundleTask(
        project: Project,
        capitalizedVariantName: String,
    ): TaskProvider<Task> {
        val taskName = "brownfieldNoopBundle${capitalizedVariantName}"
        val existing = project.tasks.findByName(taskName)
        if (existing != null) {
            return project.tasks.named(existing.name)
        }

        return project.tasks.register(taskName) { task ->
            task.group = "brownfield"
            task.description = "Fallback no-op task used when no bundle task exists for $capitalizedVariantName."
        }
    }
}
