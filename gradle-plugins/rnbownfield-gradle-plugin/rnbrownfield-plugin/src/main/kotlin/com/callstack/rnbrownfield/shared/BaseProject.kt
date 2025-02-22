package com.callstack.rnbrownfield.shared

import org.gradle.api.Project
import org.gradle.api.file.Directory

open class BaseProject {
    lateinit var project: Project
    lateinit var buildDir: Directory

    fun set(project: Project) {
        this.project = project
        this.buildDir = project.layout.buildDirectory.get()
    }
}
