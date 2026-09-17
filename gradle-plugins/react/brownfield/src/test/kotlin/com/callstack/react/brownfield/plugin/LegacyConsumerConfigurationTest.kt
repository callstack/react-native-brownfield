package com.callstack.react.brownfield.plugin

import com.callstack.react.brownfield.shared.Constants
import org.gradle.testkit.runner.GradleRunner
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertFalse

/**
 * Guards the pre-migration consumer shape that no in-repo app exercises any more: a project that
 * still hand-registers `removeDependenciesFromModuleFile` exactly as the published setup docs
 * (`docs/docs/docs/getting-started/android.mdx`) instruct. The plugin applies before that script
 * body runs, so if it ever claims that name again, this configuration fails outright — which is
 * a hard build break for every consumer who hasn't migrated.
 *
 * Needs a real Android SDK because the plugin requires `com.android.library`; skipped when none
 * is present so the unit-test suite stays runnable on a plain JVM.
 */
class LegacyConsumerConfigurationTest {
    @Test
    fun `a project still registering the documented legacy task configures successfully`(
        @TempDir projectDir: File,
    ) {
        val androidSdk = System.getenv("ANDROID_HOME") ?: System.getenv("ANDROID_SDK_ROOT")
        assumeTrue(
            androidSdk != null && File(androidSdk).isDirectory,
            "no Android SDK available (ANDROID_HOME/ANDROID_SDK_ROOT); skipping AGP-dependent test",
        )

        writeLegacyConsumerFixture(projectDir, androidSdk!!)

        val result =
            GradleRunner.create()
                .withProjectDir(projectDir)
                .withPluginClasspath()
                .withArguments("tasks", "--stacktrace")
                .forwardOutput()
                .build()

        // GradleRunner.build() already fails on any configuration failure, so reaching this line
        // means the fixture configured. This assertion narrows what a failure *here* means: a
        // duplicate-task-name error specifically, rather than any unrelated fixture breakage
        // (AGP upgrade, SDK, repository resolution) which build() would have surfaced above.
        assertFalse(
            result.output.contains("as a task with that name already exists"),
            "build output reports a duplicate task name; the plugin most likely claimed " +
                "'${Constants.LEGACY_CONSUMER_MODULE_METADATA_TASK_NAME}', which the setup docs " +
                "reserve for consumers",
        )
    }

    private fun writeLegacyConsumerFixture(
        projectDir: File,
        androidSdk: String,
    ) {
        File(projectDir, "settings.gradle.kts").writeText(
            """
            dependencyResolutionManagement {
                repositories {
                    google()
                    mavenCentral()
                }
            }
            rootProject.name = "legacy-consumer"
            include(":app")
            include(":brownfieldlib")
            """.trimIndent(),
        )
        File(projectDir, "local.properties").writeText("sdk.dir=$androidSdk\n")
        // The plugin's ArtifactsResolver reads the app module's `implementation` configuration to
        // find embedded native modules. An empty stub is enough here: this test is about the task
        // container, not about discovery.
        File(projectDir, "app").mkdirs()
        File(projectDir, "app/build.gradle.kts").writeText("")

        // The `tasks.register("removeDependenciesFromModuleFile")` block below is verbatim from
        // the published setup docs. Do not "modernize" it — its whole purpose is to reproduce
        // what a not-yet-migrated consumer actually has in their build script.
        File(projectDir, "brownfieldlib").mkdirs()
        File(projectDir, "brownfieldlib/build.gradle.kts").writeText(
            """
            import groovy.json.JsonOutput
            import groovy.json.JsonSlurper

            plugins {
                id("com.android.library")
                id("com.callstack.react.brownfield")
                `maven-publish`
            }

            android {
                namespace = "com.example.legacyconsumer"
                compileSdk = 34
            }

            val moduleBuildDir: Directory = layout.buildDirectory.get()

            tasks.register("removeDependenciesFromModuleFile") {
                doLast {
                    file("${'$'}moduleBuildDir/publications/mavenAar/module.json").run {
                        val json = inputStream().use { JsonSlurper().parse(it) as Map<String, Any> }
                        (json["variants"] as? List<MutableMap<String, Any>>)?.forEach { variant ->
                            (variant["dependencies"] as? MutableList<Map<String, Any>>)?.removeAll {
                                it["group"] == rootProject.name
                            }
                        }
                        writer().use { it.write(JsonOutput.prettyPrint(JsonOutput.toJson(json))) }
                    }
                }
            }
            """.trimIndent(),
        )
    }
}
