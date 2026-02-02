package com.callstack.react.brownfield.shared

object Constants {
    const val PROJECT_ID = "com.callstack.react.brownfield"
    const val PLUGIN_NAME = "react-brownfield"

    const val RE_BUNDLE_FOLDER = "aar_rebundle"
    const val INTERMEDIATES_TEMP_DIR = PLUGIN_NAME

    const val BROWNFIELD_UMBRELLA_PUBLISH_TASK_NAME = "brownfieldPublishExpoPackages"

    // TODO: check if the below need to be published!
    val BROWNFIELD_EXPO_WHITELISTED_PUBLISHABLE_MODULES =
        setOf("expo-modules-core", "expo-constants", "expo")
    val BROWNFIELD_EXPO_MODULES_WITHOUT_LOCAL_MAVEN_REPO =
        setOf("expo-constants", "expo-modules-core", "expo")
}
