package com.callstack.react.brownfield.processors

import com.android.build.api.variant.LibraryVariant
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary

object ResourceTaskProcessor {
    fun process(
        variant: LibraryVariant,
        aarLibraries: List<AndroidArchiveLibrary>,
    ) {
        val resDirectories = aarLibraries.map { it.getResDir() }.filter { it.exists() }

        resDirectories.forEach { resDirectory ->
            variant.sources.res?.addStaticSourceDirectory(resDirectory.path)
        }
    }
}
