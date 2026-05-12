package com.callstack.react.brownfield.processors

import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.api.LibraryVariant
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import org.gradle.api.Project

object AssetTaskProcessor {
    fun process(
        variant: LibraryVariant,
        project: Project,
        aarLibraries: List<AndroidArchiveLibrary>,
    ) {
        val assetsTask = variant.mergeAssetsProvider.get()

        val androidExtension = project.extensions.getByName("android") as LibraryExtension
        assetsTask.doFirst {
            val filteredSourceSets =
                androidExtension.sourceSets.filter { it.name == variant.name }

            filteredSourceSets.forEach { sourceSet ->
                val filteredAarLibs = aarLibraries.filter { it.getAssetsDir().exists() }
                if (!filteredAarLibs.isEmpty()) {
                    sourceSet.assets.srcDirs(filteredAarLibs.map { it.getAssetsDir() })
                }
            }
        }
    }
}
