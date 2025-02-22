package com.callstack.rnbrownfield.plugin

import com.callstack.rnbrownfield.shared.Constants.PROJECT_ID
import com.callstack.rnbrownfield.shared.Logging
import com.callstack.rnbrownfield.utils.AndroidArchiveLibrary
import com.callstack.rnbrownfield.utils.DirectoryManager
import com.callstack.rnbrownfield.utils.Extension
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.ProjectConfigurationException
import org.gradle.api.provider.MapProperty

class RNBrownfieldPlugin : Plugin<Project> {
    private lateinit var project: Project
    private lateinit var extension: Extension
    private lateinit var projectConfigurations: ProjectConfigurations
    private lateinit var variantPackagesProperty: MapProperty<String, List<AndroidArchiveLibrary>>

    override fun apply(project: Project) {
        println("Hello from RNBrownfieldPlugin!")
        this.project = project
        verifyAndroidPluginApplied()
        Logging.project = project
        DirectoryManager.project = project
        this.extension = project.extensions.create(Extension.NAME, Extension::class.java)
        projectConfigurations = ProjectConfigurations(project)
        projectConfigurations.setup()
        registerRClassTransformer()
    }

    /**
     * Verifies and throws error if `com.android.library` plugin is not applied
     */
    private fun verifyAndroidPluginApplied() {
        if (!project.plugins.hasPlugin("com.android.library")) {
            throw ProjectConfigurationException(
                "$PROJECT_ID must be applied to an android library project",
                Throwable("Apply $PROJECT_ID"),
            )
        }
    }

    /**
     * Transforms RClass
     */
    private fun registerRClassTransformer() {
        variantPackagesProperty = project.objects.mapProperty(String::class.java, List::class.java as Class<List<AndroidArchiveLibrary>>)
        RClassTransformer.registerASMTransformation(project, variantPackagesProperty)
    }
}
