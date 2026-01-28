@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.react.brownfield.processors

import com.android.build.gradle.api.LibraryVariant
import com.android.build.gradle.internal.tasks.factory.dependsOn
import com.callstack.react.brownfield.exceptions.TaskNotFound
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import org.gradle.api.provider.ListProperty
import java.io.File

class VariantProcessor(private val variant: LibraryVariant) : BaseProject() {
    private val capitalizedVariantName = variant.name.replaceFirstChar(Char::titlecase)
    private val variantHelper = VariantHelper(variant)
    private val variantTaskProvider = VariantTaskProvider(variantHelper)
    private val proguardProcessor = ProguardProcessor(variant)
    private val aarLibraries = mutableListOf<AndroidArchiveLibrary>()
    private lateinit var aarLibrariesProperty: ListProperty<AndroidArchiveLibrary>
    private val jarFiles = mutableListOf<File>()

    private fun setup() {
        variantHelper.project = project
        variantTaskProvider.project = project
        proguardProcessor.project = project
        aarLibrariesProperty = project.objects.listProperty(AndroidArchiveLibrary::class.java)
        VariantPackagesProperty.getVariantPackagesProperty().put(variant.name, aarLibrariesProperty)
    }

    fun processVariant(artifacts: List<UnresolvedArtifactInfo>) {
        setup()
        val preBuildTaskPath = "pre${capitalizedVariantName}Build"
        val prepareTask = project.tasks.named(preBuildTaskPath)

        if (!prepareTask.isPresent) {
            throw TaskNotFound("Can not find $preBuildTaskPath task")
        }

        if (capitalizedVariantName.contains("Release")) {
            prepareTask.dependsOn(":app:createBundle${capitalizedVariantName}JsAndAssets")
        }

        if (aarLibraries.isEmpty()) return

//        proguardProcessor.processConsumerFiles(aarLibraries)
//        proguardProcessor.processGeneratedFiles(aarLibraries)
//        variantTaskProvider.processDataBinding(bundleTask, aarLibraries)
//        variantTaskProvider.processDeepLinkTasks()
    }
}
