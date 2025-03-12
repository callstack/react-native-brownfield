package com.callstack.react.brownfield.shared

import org.gradle.api.Project
import org.gradle.api.file.Directory

open class BaseProject {
    private var _project: Project? = null

    var project: Project
        get() = checkNotNull(_project) { "Project has not been initialized" }
        set(value) {
            _project = value
        }

    val buildDir: Directory
        get() = project.layout.buildDirectory.get()
}
