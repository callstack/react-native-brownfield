package com.callstack.react.brownfield.shared

object Constants {
    const val PROJECT_ID = "com.callstack.react.brownfield"
    const val PLUGIN_NAME = "react-brownfield"

    const val RE_BUNDLE_FOLDER = "aar_rebundle"
    const val INTERMEDIATES_TEMP_DIR = PLUGIN_NAME

    val BROWNFIELD_EXPO_GROUP_IDS_BLACKLIST = setOf(
        // below: groupIds of Expo components in node_modules
        "host.exp.exponent", "BareExpo", "expo",
        // below: groupId of the local Expo app itself that may be referenced by some of the Expo packages
        "ExpoApp"
    )
//    val BROWNFIELD_RN_ARTIFACTS_BLACKLIST = setOf(
//        FilterPackageInfo(groupId = "com.facebook.react", artifactId = "react-android"),
//        FilterPackageInfo(groupId = "com.facebook.react", artifactId = "hermes-android")
//    )
}
