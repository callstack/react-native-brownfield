package com.callstack.react.brownfield.plugin.expo.utils

data class BrownfieldPublishingInfo(
    val groupId: String,
    val artifactId: String,
    val version: String,
)

data class POMDependency(
    val groupId: String,
    val artifactId: String,
    val version: String?,
    val scope: String,
    val optional: Boolean
)

data class FilterPackageInfo(
    val groupId: String,
    val artifactId: String,
)
