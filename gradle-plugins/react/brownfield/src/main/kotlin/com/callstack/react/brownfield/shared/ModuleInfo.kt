package com.callstack.react.brownfield.shared

import org.gradle.api.Task
import java.io.File
import kotlinx.serialization.Serializable

interface ModuleInfo {
    val moduleGroup: String
    val moduleName: String
    val moduleVersion: String

    val file: String

    val type: String
        get() = "aar"

    val dependencies: Set<String>?
    val bundleTaskName: String?
}

@Serializable
data class UnresolvedArtifactInfo(
    override val moduleGroup: String,
    override val moduleName: String,
    override val moduleVersion: String,
    override val file: String,
    override val dependencies: Set<String>?,
    override val bundleTaskName: String?,
) : ModuleInfo

