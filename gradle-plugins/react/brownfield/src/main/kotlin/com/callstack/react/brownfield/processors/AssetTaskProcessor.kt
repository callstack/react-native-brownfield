package com.callstack.react.brownfield.processors

import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.api.LibraryVariant
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.Extension
import com.callstack.react.brownfield.utils.Utils
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project

object AssetTaskProcessor {
    fun process(
        variant: LibraryVariant,
        project: Project,
        aarLibraries: List<AndroidArchiveLibrary>,
    ) {
        val assetsTask = variant.mergeAssetsProvider.get()
        val projectExtension = project.extensions.getByType(Extension::class.java)
        val bundledAssetsVariantName =
            Utils.getBundledAssetsVariantName(
                variantName = variant.name,
                buildTypeName = variant.buildType.name,
                isDebuggable = variant.buildType.isDebuggable,
            )
        val capitalizedBundledAssetsVariantName = bundledAssetsVariantName.capitalized()
        val appProject = project.rootProject.project(projectExtension.appProjectName)
        val updatesResourcesTaskName = "create${variant.name.capitalized()}UpdatesResources"

        val androidExtension = project.extensions.getByName("android") as LibraryExtension
        assetsTask.dependsOn("${appProject.path}:createBundle${capitalizedBundledAssetsVariantName}JsAndAssets")

        if (Utils.isExpoProject(project) && appProject.tasks.names.contains(updatesResourcesTaskName)) {
            assetsTask.dependsOn(
                "${appProject.path}:$updatesResourcesTaskName",
            )
        }

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
