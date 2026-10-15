package com.callstack.react.brownfield.plugin

import org.gradle.testkit.runner.GradleRunner
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.MethodSource
import java.io.File
import kotlin.test.assertTrue

/**
 * Configures a minimal android library against every AGP version in the matrix declared in
 * `build.gradle.kts`.
 *
 * The plugin compiles against the OLDEST supported AGP, which is what stops it from reaching for an
 * API newer AGP added. That leaves the opposite direction uncovered: an API the floor has but a
 * newer AGP removed, renamed or narrowed compiles cleanly and only breaks at the consumer. This
 * test is the coverage for that direction, so the newest entry in the matrix is the one earning its
 * keep here.
 *
 * Skipped without an Android SDK, since the plugin requires `com.android.library`.
 */
class AgpCompatibilityMatrixTest {
    @ParameterizedTest(name = "configures cleanly on AGP {0}")
    @MethodSource("agpVersions")
    fun `the plugin configures an android library on every supported AGP`(
        agpVersion: String,
        @TempDir projectDir: File,
    ) {
        val androidSdk = System.getenv("ANDROID_HOME") ?: System.getenv("ANDROID_SDK_ROOT")
        assumeTrue(
            androidSdk != null && File(androidSdk).isDirectory,
            "no Android SDK available (ANDROID_HOME/ANDROID_SDK_ROOT); skipping AGP-dependent test",
        )

        writeFixture(projectDir, androidSdk!!)

        // `--dry-run` still runs configuration in full — variant callbacks, source set wiring, task
        // graph construction — which is where every AGP API the plugin touches is exercised. It just
        // skips the task actions, which would need a real RN app to produce anything meaningful.
        GradleRunner.create()
            .withProjectDir(projectDir)
            .withPluginClasspath(pluginClasspathFor(agpVersion))
            .withArguments("assembleDebug", "--dry-run", "--stacktrace")
            .forwardOutput()
            .build()
    }

    @Test
    fun `the apply-time gate rejects AGP older than the floor`(
        @TempDir projectDir: File,
    ) {
        val androidSdk = System.getenv("ANDROID_HOME") ?: System.getenv("ANDROID_SDK_ROOT")
        assumeTrue(
            androidSdk != null && File(androidSdk).isDirectory,
            "no Android SDK available (ANDROID_HOME/ANDROID_SDK_ROOT); skipping AGP-dependent test",
        )

        writeFixture(projectDir, androidSdk!!)

        val belowFloor = requireNotNull(System.getProperty("agp.belowFloor.version"))
        val result =
            GradleRunner.create()
                .withProjectDir(projectDir)
                .withPluginClasspath(pluginClasspathFor(belowFloor))
                .withArguments("tasks")
                .buildAndFail()

        assertTrue(
            result.output.contains("requires Android Gradle Plugin"),
            "expected the plugin's own AGP gate to reject AGP $belowFloor, but the build failed " +
                "for some other reason:\n${result.output}",
        )
    }

    private fun pluginClasspathFor(agpVersion: String): List<File> {
        val raw =
            requireNotNull(System.getProperty("agp.classpath.$agpVersion")) {
                "no TestKit classpath was injected for AGP $agpVersion; check the agpMatrix wiring in build.gradle.kts"
            }
        return raw.split(File.pathSeparator).filter { it.isNotBlank() }.map(::File)
    }

    private fun writeFixture(
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
            rootProject.name = "agp-matrix-consumer"
            include(":app")
            include(":brownfieldlib")
            """.trimIndent(),
        )
        File(projectDir, "local.properties").writeText("sdk.dir=$androidSdk\n")
        // Stands in for the RN app project. It has to be a real `com.android.application` because
        // the brownfield plugin wires into AGP's own app-side tasks; the extra registrations cover
        // the tasks the React Native Gradle plugin would otherwise contribute. Empty registrations
        // are enough: this test is about AGP API compatibility, not about what those tasks produce.
        File(projectDir, "app").mkdirs()
        File(projectDir, "app/build.gradle.kts").writeText(
            """
            plugins {
                id("com.android.application")
            }

            android {
                namespace = "com.example.agpmatrix.app"
                compileSdk = 34
            }

            listOf(
                "generateAutolinkingPackageList",
                "createBundleDebugJsAndAssets",
                "createBundleReleaseJsAndAssets",
            ).forEach { name -> tasks.register(name) }
            """.trimIndent(),
        )

        File(projectDir, "brownfieldlib").mkdirs()
        File(projectDir, "brownfieldlib/build.gradle.kts").writeText(
            """
            plugins {
                id("com.android.library")
                id("com.callstack.react.brownfield")
                `maven-publish`
            }

            android {
                namespace = "com.example.agpmatrix"
                compileSdk = 34
            }

            // Contributed by the React Native Gradle plugin in a real consumer; stubbed here for the
            // same reason as the app-side tasks above.
            tasks.register("generateCodegenSchemaFromJavaScript")
            """.trimIndent(),
        )
    }

    private companion object {
        @JvmStatic
        fun agpVersions(): List<String> =
            requireNotNull(System.getProperty("agp.matrix.versions")) {
                "agp.matrix.versions was not injected; check the agpMatrix wiring in build.gradle.kts"
            }.split(",").filter { it.isNotBlank() }
    }
}
