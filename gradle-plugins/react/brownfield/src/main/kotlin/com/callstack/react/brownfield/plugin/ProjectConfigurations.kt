package com.callstack.react.brownfield.plugin

import com.android.build.api.attributes.AgpVersionAttr
import com.android.build.api.attributes.BuildTypeAttr
import com.android.build.api.variant.LibraryAndroidComponentsExtension
import com.android.build.gradle.LibraryExtension
import com.android.build.gradle.internal.attributes.VariantAttr
import com.callstack.react.brownfield.shared.Logging
import org.gradle.api.Project
import org.gradle.api.artifacts.Configuration
import org.gradle.api.attributes.Attribute
import org.gradle.api.attributes.AttributeContainer
import org.gradle.api.attributes.Usage
import org.gradle.api.attributes.java.TargetJvmEnvironment
import org.gradle.api.internal.artifacts.ArtifactAttributes

class ProjectConfigurations(private val project: Project) {
    private val configurations: MutableCollection<Configuration> = mutableListOf()

    companion object {
        const val CONFIG_NAME = "embed"
        const val CONFIG_SUFFIX = "Embed"
    }

    fun getConfigurations(): MutableCollection<Configuration> {
        return configurations
    }

    /**
     * Handles setting up the configuration for the project.
     * It operates in the following manner:
     *
     * 1. creates main config
     * 2. creates configs for buildTypes
     * 3. creates configs for flavours
     * 4. creates configs for flavours with buildTypes
     */
    fun configure() {
        // create main configuration
        createConfiguration(CONFIG_NAME)
        val androidExtension = project.extensions.getByName("android") as LibraryExtension
        createBuildTypesConfiguration(androidExtension)
        createFlavorConfigurations(androidExtension)
    }

    /**
     * creates configs for buildTypes
     */
    private fun createBuildTypesConfiguration(androidExtension: LibraryExtension) {
        androidExtension.buildTypes.all { buildType ->
            createConfiguration(getConfigName(buildType.name))
        }
    }

    /**
     * 1. creates configs for flavours
     * 2. creates configs for flavours with buildTypes
     */
    private fun createFlavorConfigurations(androidExtension: LibraryExtension) {
        androidExtension.productFlavors.all { flavor ->
            createConfiguration(getConfigName(flavor.name))

            androidExtension.buildTypes.all { buildType ->
                val variantName = "${flavor.name}${buildType.name.replaceFirstChar(Char::titlecase)}"
                createConfiguration(getConfigName(variantName))
            }
        }
    }

    /**
     * creates configuration based on `configName`. Also attaches a resolution listener.
     */
    private fun createConfiguration(configName: String) {
        Logging.log("creating configuration $configName ⌛️")
        val configuration = project.configurations.create(configName)

        configuration.extendsFrom(project.configurations.getByName("implementation"))
        configuration.isVisible = false
        configuration.isTransitive = false

            val androidComponents = project.extensions.getByType(LibraryAndroidComponentsExtension::class.java)
            androidComponents.onVariants { variant ->

                val runtimeAttributes = variant.runtimeConfiguration.attributes
                runtimeAttributes.keySet().forEach { key ->
                    copyAttribute(
                        key,
                        runtimeAttributes,
                        configuration.attributes
                    )
                }
            }

        project.gradle.addListener(CustomDependencyResolver(project, configuration))
        configurations.add(configuration)
        Logging.log("created configuration $configName ✅")
    }

    private fun <T> copyAttribute(key: Attribute<T>, from: AttributeContainer, into: AttributeContainer) {
        from.getAttribute(key)?.let {
            into.attribute(key, it)
        }
    }

    private fun getConfigName(prefix: String): String {
        return "${prefix}$CONFIG_SUFFIX"
    }
}
