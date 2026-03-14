package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import org.gradle.api.Project
import org.gradle.api.provider.MapProperty

object VariantPackagesProperty {
    private lateinit var properties: MapProperty<String, List<AndroidArchiveLibrary>>

    fun getVariantPackagesProperty(): MapProperty<String, List<AndroidArchiveLibrary>> {
        return properties
    }

    fun setVariantPackagesProperty(project: Project) {
        @Suppress("UNCHECKED_CAST")
        properties =
            project.objects.mapProperty(
                String::class.java,
                List::class.java as Class<List<AndroidArchiveLibrary>>,
            )
    }
}
