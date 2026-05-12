package com.callstack.react.brownfield.processors

import com.android.build.api.dsl.LibraryExtension
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project

object AssetTaskProcessor {
    fun process(
        variantName: String,
        project: Project,
        aarLibraries: List<AndroidArchiveLibrary>,
    ) {
        val capitalizedVariantName = variantName.capitalized()
        val taskNameCandidates =
            listOf(
                "merge${capitalizedVariantName}Assets",
                "merge${capitalizedVariantName}JniLibFolders",
                "package${capitalizedVariantName}Assets",
            )
        val resolvedTaskName =
            taskNameCandidates.firstOrNull { taskName ->
                project.tasks.names.contains(taskName)
            }
        val androidExtension = project.extensions.getByName("android") as LibraryExtension

        if (resolvedTaskName == null) {
            project.logger.warn(
                "Brownfield: no assets merge-related task found for variant '$variantName'. " +
                    "Checked: ${taskNameCandidates.joinToString()}. Skipping assets hook.",
            )
            return
        }

        project.tasks.named(resolvedTaskName).configure {
            it.doFirst {
                androidExtension.sourceSets
                    .matching { sourceSet -> sourceSet.name == variantName }
                    .all { sourceSet ->
                        val filteredAarLibs = aarLibraries.filter { lib -> lib.getAssetsDir().exists() }
                        if (filteredAarLibs.isNotEmpty()) {
                            sourceSet.assets.srcDirs(filteredAarLibs.map { lib -> lib.getAssetsDir() })
                        }
                    }
            }
        }
    }
}
