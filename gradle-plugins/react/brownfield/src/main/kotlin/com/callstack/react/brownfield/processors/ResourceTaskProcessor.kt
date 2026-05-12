package com.callstack.react.brownfield.processors

import com.android.build.api.dsl.LibraryExtension
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import org.gradle.api.Project

object ResourceTaskProcessor {
    fun process(
        variantName: String,
        project: Project,
        aarLibraries: List<AndroidArchiveLibrary>,
    ) {
        val androidExtension = project.extensions.getByName("android") as LibraryExtension

        androidExtension.sourceSets
            .matching { sourceSet -> sourceSet.name == variantName }
            .all { sourceSet ->
                sourceSet.res.srcDirs(
                    aarLibraries
                        .map { it.getResDir() }
                        .filter { it.exists() },
                )
            }
    }
}
