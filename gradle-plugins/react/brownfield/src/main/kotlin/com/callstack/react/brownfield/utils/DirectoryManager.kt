@file:Suppress("DEPRECATION")

/**
 * Suppressing because of LibraryVariant.
 * We can't use the new `com.android.build.gradle.api.LibraryVariant`
 * as of now.
 *
 * We may want to re-visit this in future.
 */

package com.callstack.react.brownfield.utils

import com.android.build.gradle.api.LibraryVariant
import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.Constants.INTERMEDIATES_TEMP_DIR
import com.callstack.react.brownfield.shared.Constants.RE_BUNDLE_FOLDER
import java.io.File

object DirectoryManager : BaseProject() {
    fun getMergeClassDirectory(variant: LibraryVariant): File {
        return File("$buildDir/intermediates/$INTERMEDIATES_TEMP_DIR/merge_classes/${variant.name}")
    }

    fun getKotlinMetaDirectory(variant: LibraryVariant): File {
        return project.file("$buildDir/tmp/kotlin-classes/${variant.name}/META-INF")
    }

    fun getReBundleDirectory(variant: LibraryVariant): File {
        return project.file("$buildDir/outputs/$RE_BUNDLE_FOLDER/${variant.name}")
    }
}
