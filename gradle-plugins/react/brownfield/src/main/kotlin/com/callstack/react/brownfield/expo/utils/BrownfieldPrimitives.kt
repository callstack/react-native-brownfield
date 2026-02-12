package com.callstack.react.brownfield.expo.utils

data class BrownfieldPublishingInfo(
    val groupId: String,
    val artifactId: String,
    val version: String,
)

data class DependencyInfo(
    val groupId: String,
    val artifactId: String,
    val version: String?,
    val scope: String,
    val optional: Boolean,
) {
    companion object {
        fun fromGradleDep(
            groupId: String,
            artifactId: String,
            version: String?,
        ): DependencyInfo {
            return DependencyInfo(
                groupId = groupId,
                artifactId = artifactId,
                version = version,
                scope = "compile",
                optional = false,
            )
        }
    }
}
