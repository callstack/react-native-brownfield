package com.callstack.react.brownfield.expo.utils

/**
 * Partial projection interface for data class expo.modules.plugin.configuration.GradleProject
 * resolved via reflection.
 */
interface ExpoGradleProjectProjection {
    val name: String
    val publication: ExpoPublication?
    val usePublication: Boolean
    val sourceDir: String
}


/**
 * Partial projection interface for data class expo.modules.plugin.configuration.Publication
 * resolved via reflection.
 */
interface ExpoPublication {
    val groupId: String
    val artifactId: String
    val version: String
}
