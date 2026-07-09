package com.callstack.react.brownfield.processors

import com.android.build.api.variant.LibraryVariant
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary

object AssetTaskProcessor {
    fun process(
        variant: LibraryVariant,
        aarLibraries: List<AndroidArchiveLibrary>,
    ) {
        val assetDirectories = aarLibraries.map { it.getAssetsDir() }.filter { it.exists() }

        assetDirectories.forEach { assetDirectory ->
            variant.sources.assets?.addStaticSourceDirectory(assetDirectory.path)
        }
    }
}
