package com.callstack.react.brownfield.shared

object Constants {
    const val PROJECT_ID = "com.callstack.react.brownfield"
    const val PLUGIN_NAME = "react-brownfield"

    const val RE_BUNDLE_FOLDER = "aar_rebundle"
    const val INTERMEDIATES_TEMP_DIR = PLUGIN_NAME

    // path segments for specific RN version range which need to be appended to generated/res/
    // and generated/assets/ to obtain path to resources produced by the proper build phase
    const val RN_0_82_UP_BUNDLE_PATH_SEGMENT = "react/release"
    const val RN_0_81_DOWN_BUNDLE_PATH_SEGMENT = "createBundleReleaseJsAndAssets"
}
