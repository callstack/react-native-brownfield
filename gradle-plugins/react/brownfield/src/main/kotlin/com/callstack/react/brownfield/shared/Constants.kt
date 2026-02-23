package com.callstack.react.brownfield.shared

import com.callstack.react.brownfield.expo.utils.DependencyInfo
import com.callstack.react.brownfield.utils.StringMatcher

/**
 * A condition that checks if a certain Expo version meets specific criteria
 * and returns a set of DependencyInfo objects if applicable.
 */
fun interface ExpoVersionConditionalDepSet {
    /**
     * Gets the dependency set if it is applicable for the given Expo version.
     * @param expoVersion The Expo version to check.
     * @return A set of DependencyInfo objects if the condition is met; otherwise, null.
     */
    fun getIfApplicable(expoVersion: String): Set<DependencyInfo>?
}

data class ArtifactMatcher(
    val groupId: StringMatcher? = null,
    val artifactId: StringMatcher? = null,
) {
    fun matches(
        groupId: String,
        artifactId: String,
    ): Boolean {
        val groupMatches = groupIdMatcher()?.matches(groupId) ?: true
        val artifactMatches = artifactIdMatcher()?.matches(artifactId) ?: true
        return groupMatches && artifactMatches
    }

    private fun groupIdMatcher(): StringMatcher? = groupId

    private fun artifactIdMatcher(): StringMatcher? = artifactId
}

object Constants {
    const val PROJECT_ID = "com.callstack.react.brownfield"
    const val PLUGIN_NAME = "react-brownfield"

    const val RE_BUNDLE_FOLDER = "aar_rebundle"
    const val INTERMEDIATES_TEMP_DIR = PLUGIN_NAME

    val BROWNFIELD_EXPO_TRANSITIVE_DEPS_WHITELISTED_MODULES_FOR_DISCOVERY =
        setOf("expo-modules-core", "expo-constants", "expo")
    val BROWNFIELD_EXPO_TRANSITIVE_DEPS_ARTIFACTS_BLACKLIST =
        setOf(
            // below: groupIds of Expo components in node_modules
            ArtifactMatcher(groupId = StringMatcher.literal("host.exp.exponent")),
            ArtifactMatcher(groupId = StringMatcher.literal("BareExpo")),
            ArtifactMatcher(groupId = StringMatcher.regex("expo.*")),
            // below: groupId of the local Expo app itself that may be referenced by some of the Expo packages
            ArtifactMatcher(groupId = StringMatcher.literal("ExpoApp")),
            // below: a broken transitive dependency that has no version specified and thus breaks the build
            ArtifactMatcher(
                groupId = StringMatcher.literal("org.jetbrains.kotlin"),
                artifactId = StringMatcher.literal("kotlin-build-tools-impl"),
            ),
        )
}
