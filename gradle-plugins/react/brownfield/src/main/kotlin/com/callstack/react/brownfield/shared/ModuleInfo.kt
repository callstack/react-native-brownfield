package com.callstack.react.brownfield.shared

import org.gradle.api.Task
import java.io.File

interface ModuleInfo {
    val moduleGroup: String
    val moduleName: String
    val moduleVersion: String

    val file: File

    val type: String
        get() = "aar"

    val dependencies: Set<Task>?
}

data class UnresolvedArtifactInfo(
    override val moduleGroup: String,
    override val moduleName: String,
    override val moduleVersion: String,
    override val file: File,
    override val dependencies: Set<Task>?
) : ModuleInfo

