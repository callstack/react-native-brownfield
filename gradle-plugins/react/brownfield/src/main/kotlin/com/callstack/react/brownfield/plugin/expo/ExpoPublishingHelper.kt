package com.callstack.react.brownfield.plugin.expo

import com.callstack.react.brownfield.plugin.RNBrownfieldPlugin.Companion.EXPO_PROJECT_LOCATOR
import com.callstack.react.brownfield.plugin.expo.utils.ExpoGradleProjectProjection
import com.callstack.react.brownfield.plugin.expo.utils.ExpoPublication
import com.callstack.react.brownfield.plugin.expo.utils.ReflectionUtils
import com.callstack.react.brownfield.shared.Constants
import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.utils.capitalized
import org.gradle.api.Project
import org.gradle.api.publish.PublishingExtension
import org.gradle.api.publish.maven.MavenPublication

open class ExpoPublishingHelper(val brownfieldAppProject: Project) {
    fun configure() {
        brownfieldAppProject.evaluationDependsOn(EXPO_PROJECT_LOCATOR)

        brownfieldAppProject.afterEvaluate {
            val publishingExtension =
                brownfieldAppProject.extensions.getByType(PublishingExtension::class.java)

            val publishableExpoProjects = getPublishableExpoProjects()

            Logging.log(
                "Discovered ${publishableExpoProjects.size} publishable Expo projects: " + publishableExpoProjects.joinToString(
                    ", "
                ) { it.name })

            val publicationTaskNames = mutableSetOf<String>()
            publishableExpoProjects.forEach { expoProj ->
                val publicationTaskName = configureExpoPublishingForVariant(
                    expoGPProjection = expoProj,
                    publishingExtension = publishingExtension
                )

                publicationTaskNames.add(publicationTaskName)
            }

            brownfieldAppProject.tasks.register(Constants.BROWNFIELD_UMBRELLA_PUBLISH_TASK_NAME)
                .configure {
                    it.dependsOn(publicationTaskNames)
                }

            Logging.log("Created umbrella task '${Constants.BROWNFIELD_UMBRELLA_PUBLISH_TASK_NAME}' wrapping Expo publication tasks: $publicationTaskNames")
        }
    }

    fun configureExpoPublishingForVariant(
        expoGPProjection: ExpoGradleProjectProjection,
        publishingExtension: PublishingExtension,
    ): String {
        Logging.log("Configuring publishing for Expo project ${expoGPProjection.name}")

        val publishTaskName =
            // convert from "kebab-case" or/and "snake_case" to "PascalCase"
            "brownfieldPublish${
                (expoGPProjection.name).split("-", "_").joinToString("") { it.capitalized() }
            }"

        publishingExtension.publications.create(
            publishTaskName,
            MavenPublication::class.java
        ) { mavenPublication ->
            with(mavenPublication) {
                groupId = expoGPProjection.publication!!.groupId
                artifactId = expoGPProjection.publication!!.artifactId
                version = expoGPProjection.publication!!.version
            }
        }

        return publishTaskName
    }

    protected fun getPublishableExpoProjects(): List<ExpoGradleProjectProjection> {
        val expoExtension =
            (brownfieldAppProject.rootProject.gradle.extensions.findByType(Class.forName("expo.modules.plugin.ExpoGradleExtension"))
                ?: throw IllegalStateException(
                    "Expo Gradle extension not found. This should never happen in an Expo project."
                ))

        // expoExtension.config
        val config = expoExtension.javaClass
            .getMethod("getConfig")
            .invoke(expoExtension)

        // ...config.allProjects - each project is actually a data class expo.modules.plugin.configuration.GradleProject
        val allProjects = config.javaClass
            .getMethod("getAllProjects")
            .invoke(config) as? Iterable<*>

        // ...filter { it.usePublication }
        @Suppress("UNCHECKED_CAST")
        return allProjects!!
            .filter { project ->
                val getter = project?.javaClass
                    ?.methods
                    ?.firstOrNull { method ->
                        listOf("get", "is").map { prefix -> "${prefix}UsePublication" }
                            .contains(method.name)
                    }
                (getter?.invoke(project) as? Boolean) == true
            }
            .map { expoGradleProject ->
                ReflectionUtils.wrapObjectProxy(
                    expoGradleProject!!,
                    ExpoGradleProjectProjection::class.java,
                    nested = listOf(
                        ExpoPublication::class.java
                    )
                )
            }
    }
}