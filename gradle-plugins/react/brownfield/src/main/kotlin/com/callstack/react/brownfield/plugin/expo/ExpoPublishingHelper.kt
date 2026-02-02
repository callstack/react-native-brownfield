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
import java.io.File


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

                    if (!publicationTaskName.isNullOrEmpty()) {
                        publicationTaskNames.add("publish${publicationTaskName.capitalized()}ToMavenLocal")
                    }
                } catch (e: Exception) {
                    Logging.error(
                        "Failed to configure publishing for Expo project ${expoProj.name}",
                        e
                    )
                }
            }

//                .configure { it.dependsOn(publicationTaskNames) }

//            val pubTasks = mutableListOf<PublishToMavenRepository>()
//
//            brownfieldAppProject.rootProject.subprojects { subproject ->
//                subproject.gradle.taskGraph.whenReady {
//                    subproject.tasks.withType(PublishToMavenRepository::class.java)
////                    .matching { it.publication == pub }
//                        .configureEach { task ->
//                            // lazily wire each publish task into the umbrella task
//                            pubTasks.add(task)
//                        }
//                }
//            }
//
            brownfieldAppProject.tasks.register(Constants.BROWNFIELD_UMBRELLA_PUBLISH_TASK_NAME)
                .configure { it.dependsOn(publicationTaskNames) }

            Logging.log("Created umbrella task '${Constants.BROWNFIELD_UMBRELLA_PUBLISH_TASK_NAME}' wrapping ${publicationTaskNames.size} Expo publication tasks: $publicationTaskNames")
        }
    }

    fun configureExpoPublishingForVariant(
        expoGPProjection: ExpoGradleProjectProjection,
        publishingExtension: PublishingExtension,
    ): String? {
        val publication = getPublishingInfo(expoGPProjection)

        if (publication == null) {
            Logging.log("WARNING: cannot configure publishing for Expo project ${expoGPProjection.name} - a matching Android Gradle project for it has not been found")
            return null
        }

        val pub = publishingExtension.publications.create(
            // convert from "kebab-case" or/and "snake_case" to "PascalCase"
            (expoGPProjection.name).split("-", "_").joinToString("") { it.capitalized() },
            MavenPublication::class.java
        ) { mavenPublication ->
            with(mavenPublication) {
                groupId = publication.groupId
                artifactId = publication.artifactId
                version = publication.version

                if (!Constants.BROWNFIELD_EXPO_MODULES_WITHOUT_LOCAL_MAVEN_REPO.contains(
                        expoGPProjection.name
                    )
                ) {
                    val expoPkgLocalMavenRepo =
                        File(expoGPProjection.sourceDir).parentFile.resolve("local-maven-repo")

                    pom.withXml { xmlProvider ->
                        val pomFile =
                            expoPkgLocalMavenRepo
                                .resolve(
                                    "${
                                        publication.groupId.replace(
                                            '.',
                                            '/'
                                        )
                                    }/${publication.artifactId}/${publication.version}/${publication.artifactId}-${publication.version}.pom"
                                )

                        if (!pomFile.exists()) {
                            throw IllegalStateException("Expo package '$expoGPProjection.name' does not have a POM file in its local-maven-repo: $pomFile")
                        }

//                    val xmlContent = xmlProvider.asString()
//                    xmlContent.setLength(0)
//                    xmlContent.append(pomFile.readText())
                        xmlProvider.asString().apply {
                            setLength(0)
                            append(pomFile.readText())
                        }
                    }

                    expoPkgLocalMavenRepo
                        .resolve(
                            "${
                                publication.groupId.replace(
                                    '.',
                                    '/'
                                )
                            }/${publication.artifactId}/${publication.version}"
                        )
                        .listFiles()
                        ?.filter { file ->
                            setOf(
                                "aar",
                                "jar",
                                "module"
                            ).contains(file.extension)
                        }
                        ?.forEach { file -> artifact(file) }
                }
            }
        }

        Logging.log("Configured publishing for Expo project '${expoGPProjection.name}' in task '${pub.name}': " + publication)

        return pub.name
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

    fun getPublishingInfo(expoGPProjection: ExpoGradleProjectProjection): BrownfieldPublishingInfo? {
        return (expoGPProjection.publication?.let {
            BrownfieldPublishingInfo(
                groupId = it.groupId,
                artifactId = it.artifactId,
                version = it.version,
            )
        } ?: run {
            val targetProject =
                brownfieldAppProject.rootProject.allprojects.firstOrNull { it.projectDir.absoluteFile.path == expoGPProjection.sourceDir }

            if (targetProject == null) {
                return null
            }

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
                    ?: targetProject.version.toString()),
            ))
        })
    }
}