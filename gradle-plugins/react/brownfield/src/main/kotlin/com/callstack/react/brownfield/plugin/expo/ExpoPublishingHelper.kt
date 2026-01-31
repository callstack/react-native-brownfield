package com.callstack.react.brownfield.plugin.expo

import com.android.build.gradle.LibraryExtension
import com.callstack.react.brownfield.plugin.RNBrownfieldPlugin.Companion.EXPO_PROJECT_LOCATOR
import com.callstack.react.brownfield.plugin.expo.utils.BrownfieldPublishingInfo
import com.callstack.react.brownfield.plugin.expo.utils.ExpoGradleProjectProjection
import com.callstack.react.brownfield.plugin.expo.utils.asExpoGradleProjectProjection
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
                try {
                    val publicationTaskName = configureExpoPublishingForVariant(
                        expoGPProjection = expoProj,
                        publishingExtension = publishingExtension
                    )

                    publicationTaskNames.add(publicationTaskName)
                } catch (e: Exception) {
                    Logging.error(
                        "Failed to configure publishing for Expo project ${expoProj.name}",
                        e
                    )
                }
            }

            brownfieldAppProject.tasks.register(Constants.BROWNFIELD_UMBRELLA_PUBLISH_TASK_NAME)
                .configure {
                    it.dependsOn(publicationTaskNames)
                }

            Logging.log("Created umbrella task '${Constants.BROWNFIELD_UMBRELLA_PUBLISH_TASK_NAME}' wrapping ${publicationTaskNames.size} Expo publication tasks: $publicationTaskNames")
        }
    }

    fun configureExpoPublishingForVariant(
        expoGPProjection: ExpoGradleProjectProjection,
        publishingExtension: PublishingExtension,
    ): String {
        val publication = getPublishingInfo(expoGPProjection)

        Logging.log("Configuring publishing for Expo project ${expoGPProjection.name}: " + publication)

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
                groupId = publication.groupId
                artifactId = publication.artifactId
                version = publication.version
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
            .filterNotNull()
            .filter { expoInternalProject ->
                // expoInternalProject is a data class - expo.modules.plugin.configuration.GradleProject
                // since Expo itself is not provided via Maven but added via local node_modules
                // and this plugin supports RN Vanilla projects, it is not possible to have
                // a dependency on Expo's APIs; therefore, access happens via reflection,
                // which in turn is hidden behind the ReflectionUtils.wrapObjectProxy abstraction
                // here provided by the asExpoGradleProjectProjection() extension fun; effectively,
                // this means access is provided via a proxy exposing conformant partial interfaces,
                // to which the original entities are projected
                val expoGradleProjectProjection =
                    expoInternalProject.asExpoGradleProjectProjection()

                val metadataConfirmsPublishable = expoGradleProjectProjection.usePublication

                // also publish crucial components possibly creating the config, as they
                // do not have neither the metadata field set, nor any Maven publishing config
                val whitelistCondition =
                    Constants.BROWNFIELD_EXPO_WHITELISTED_PUBLISHABLE_MODULES.contains(
                        expoGradleProjectProjection.name
                    )

                return@filter metadataConfirmsPublishable || whitelistCondition
            }
            .map { expoGradleProject -> expoGradleProject.asExpoGradleProjectProjection() }
    }

    fun getPublishingInfo(expoGPProjection: ExpoGradleProjectProjection): BrownfieldPublishingInfo {
        return (expoGPProjection.publication?.let {
            BrownfieldPublishingInfo(
                groupId = it.groupId, artifactId = it.artifactId, version = it.version
            )
        } ?: run {
            val targetProject =
                brownfieldAppProject.rootProject.allprojects.first { it.projectDir.absoluteFile.path == expoGPProjection.sourceDir }

            val targetProjectAndroidLibExt =
                targetProject.extensions.getByType(LibraryExtension::class.java)

            val packagePieces = targetProjectAndroidLibExt.namespace!!.split(".")
            val artifactId = packagePieces.last()
            // below: remove the trailing artifactId component -> leaves only the groupId components
            val groupId = packagePieces.dropLast(1).joinToString(".")

            (BrownfieldPublishingInfo(
                groupId = groupId,
                artifactId = artifactId,
                version = (targetProjectAndroidLibExt.defaultConfig.versionName
                    ?: targetProject.version.toString())
            ))
        })
    }
}