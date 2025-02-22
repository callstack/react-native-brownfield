package com.callstack.rnbrownfield.plugin

import org.gradle.api.Plugin
import org.gradle.api.Project

class RNBrownfieldPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        println("Hello from RNBrownfieldPlugin!")
    }
}
