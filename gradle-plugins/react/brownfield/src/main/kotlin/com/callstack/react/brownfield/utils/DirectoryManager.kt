package com.callstack.react.brownfield.utils

import com.callstack.react.brownfield.shared.BaseProject
import com.callstack.react.brownfield.shared.Constants.INTERMEDIATES_TEMP_DIR
import java.io.File

object DirectoryManager : BaseProject() {
    fun getMergeClassDirectory(variantName: String): File {
        return project.file("$buildDir/intermediates/$INTERMEDIATES_TEMP_DIR/merge_classes/$variantName")
    }

    fun getKotlinMetaDirectory(variantName: String): File {
        return project.file("$buildDir/tmp/kotlin-classes/$variantName/META-INF")
    }
}
