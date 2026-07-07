package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.utils.capitalized

object VariantHelper {
    fun getAsmTransformTaskName(capitalizedVariantName: String): String {
        return "transform${capitalizedVariantName}ClassesWithAsm"
    }

    fun getBundledAssetsVariantName(
        variantName: String?,
        buildTypeName: String?,
        isDebuggable: Boolean,
    ): String {
        require(!variantName.isNullOrEmpty()) {
            "getBundledAssetsVariantName: Variant name cannot be empty"
        }

        require(!buildTypeName.isNullOrEmpty()) {
            "getBundledAssetsVariantName: Build Type cannot be empty"
        }

        if (!isDebuggable) {
            return variantName
        }

        if (variantName == buildTypeName) {
            return "release"
        }

        val capitalizedBuildTypeName = buildTypeName.capitalized()
        return if (variantName.endsWith(capitalizedBuildTypeName)) {
            "${variantName.removeSuffix(capitalizedBuildTypeName)}Release"
        } else {
            "release"
        }
    }

    fun getExpoUpdatesResourcesTaskName(variantName: String): String {
        return "create${variantName.capitalized()}UpdatesResources"
    }
}
