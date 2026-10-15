package com.callstack.react.brownfield.utils

import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class AndroidArchiveLibraryNamespaceFallbackTest {
    private fun artifactFor(moduleName: String) =
        UnresolvedArtifactInfo(
            moduleGroup = "com.example",
            moduleName = moduleName,
            moduleVersion = "1.0.0",
            file = null,
            isExpoPublishDependency = false,
        )

    @Test
    fun `falls back to the AndroidManifest package when build-gradle declares no namespace`() {
        val root = ProjectBuilder.builder().build()
        val subProject =
            ProjectBuilder.builder()
                .withParent(root)
                .withName("react-native-launch-arguments")
                .build()

        // No `namespace` declaration, mirroring libraries whose build.gradle predates AGP namespaces.
        subProject.projectDir.mkdirs()
        subProject.buildFile.writeText(
            """
            apply plugin: 'com.android.library'
            """.trimIndent(),
        )
        subProject.projectDir.resolve("src/main").mkdirs()
        subProject.projectDir.resolve("src/main/AndroidManifest.xml").writeText(
            """
            <manifest xmlns:android="http://schemas.android.com/apk/res/android"
                      package="com.reactnativelauncharguments">
            </manifest>
            """.trimIndent(),
        )

        val library = AndroidArchiveLibrary(root, artifactFor("react-native-launch-arguments"), "devRelease")

        assertEquals("com.reactnativelauncharguments", library.getPackageName())
    }

    @Test
    fun `prefers the namespace declared in build-gradle over the manifest package`() {
        val root = ProjectBuilder.builder().build()
        val subProject =
            ProjectBuilder.builder()
                .withParent(root)
                .withName("react-native-screens")
                .build()

        subProject.projectDir.mkdirs()
        subProject.buildFile.writeText(
            """
            apply plugin: 'com.android.library'
            android {
                namespace = "com.swmansion.rnscreens"
            }
            """.trimIndent(),
        )
        subProject.projectDir.resolve("src/main").mkdirs()
        subProject.projectDir.resolve("src/main/AndroidManifest.xml").writeText(
            """
            <manifest xmlns:android="http://schemas.android.com/apk/res/android"
                      package="com.swmansion.rnscreens.legacy">
            </manifest>
            """.trimIndent(),
        )

        val library = AndroidArchiveLibrary(root, artifactFor("react-native-screens"), "devRelease")

        assertEquals("com.swmansion.rnscreens", library.getPackageName())
    }

    @Test
    fun `errors when neither build-gradle nor the manifest declare a namespace`() {
        val root = ProjectBuilder.builder().build()
        val subProject =
            ProjectBuilder.builder()
                .withParent(root)
                .withName("no-namespace-anywhere")
                .build()

        subProject.projectDir.mkdirs()
        subProject.buildFile.writeText(
            """
            apply plugin: 'com.android.library'
            """.trimIndent(),
        )

        val library = AndroidArchiveLibrary(root, artifactFor("no-namespace-anywhere"), "devRelease")

        assertFailsWith<IllegalStateException> { library.getPackageName() }
    }
}
