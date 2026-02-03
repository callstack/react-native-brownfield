package com.callstack.react.brownfield.shared

import com.callstack.react.brownfield.plugin.expo.utils.POMDependency

/**
 * A condition that checks if a certain Expo version meets specific criteria
 * and returns a set of POMDependency objects if applicable.
 */
fun interface ExpoVersionCondition {
    /**
     * Checks if the condition is applicable for the given Expo version.
     * @param expoVersion The Expo version to check.
     * @return A set of POMDependency objects if the condition is met; otherwise, null.
     */
    fun checkIfApplicable(expoVersion: String): Set<POMDependency>?
}

object Constants {
    const val PROJECT_ID = "com.callstack.react.brownfield"
    const val PLUGIN_NAME = "react-brownfield"

    const val RE_BUNDLE_FOLDER = "aar_rebundle"
    const val INTERMEDIATES_TEMP_DIR = PLUGIN_NAME

    val BROWNFIELD_EXPO_WHITELISTED_DEPENDENCY_DISCOVERY_MODULES =
        setOf("expo-modules-core", "expo-constants", "expo")
    val BROWNFIELD_EXPO_GROUP_IDS_BLACKLIST = setOf(
        // below: groupIds of Expo components in node_modules
        "host.exp.exponent", "BareExpo", "expo",
        // below: groupId of the local Expo app itself that may be referenced by some of the Expo packages
        "ExpoApp"
    )
    val BROWNFIELD_EXPO_INJECT_PREDEFINED_DEPENDENCIES = setOf<ExpoVersionCondition>(
        // below: required by https://github.com/expo/expo/blob/main/packages/expo-constants/android/build.gradle
        ExpoVersionCondition { expoVersion ->
            if (expoVersion)

                setOf(
                    POMDependency(
                        groupId = "commons-io",
                        artifactId = "commons-io",
                        version = "18.2.0",
                        scope = "implementation",
                        optional = false
                    )
                )
        },

        // below:
        POMDependency(
            groupId = "com.facebook.react",
            artifactId = "hermes-android",
            version = "0.72.1",
            scope = "implementation",
            optional = false
        )
    )
//    TODO: is this correct to be eliminated? val BROWNFIELD_RN_ARTIFACTS_BLACKLIST = setOf(
//        FilterPackageInfo(groupId = "com.facebook.react", artifactId = "react-android"),
//        FilterPackageInfo(groupId = "com.facebook.react", artifactId = "hermes-android")
//    )
}
