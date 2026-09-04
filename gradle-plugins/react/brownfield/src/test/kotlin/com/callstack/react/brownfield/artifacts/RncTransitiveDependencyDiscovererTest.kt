package com.callstack.react.brownfield.artifacts

import com.callstack.react.brownfield.shared.DependencyInfo
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RncTransitiveDependencyDiscovererTest {
    @Test
    fun `discovers a module's direct external dependencies, skipping project deps and non-publishable coordinates`() {
        val root = ProjectBuilder.builder().build()
        val consumer = ProjectBuilder.builder().withParent(root).withName("BrownfieldLib").build()
        val embeddedModule = ProjectBuilder.builder().withParent(root).withName("react-native-fake-module").build()
        val siblingProject = ProjectBuilder.builder().withParent(root).withName("some-other-module").build()

        embeddedModule.configurations.create("implementation")
        embeddedModule.configurations.create("api")
        embeddedModule.configurations.create("runtimeOnly")

        embeddedModule.dependencies.add("implementation", "androidx.appcompat:appcompat:1.7.1")
        embeddedModule.dependencies.add("api", "com.facebook.react:hermes-android:0.87.0")
        embeddedModule.dependencies.add("implementation", "com.facebook.react:react-native:+")
        embeddedModule.dependencies.add(
            "implementation",
            embeddedModule.dependencies.project(mapOf("path" to siblingProject.path)),
        )

        consumer.configurations.create("api")
        consumer.dependencies.add("api", "com.facebook.react:hermes-android:0.87.0")

        val artifacts =
            listOf(
                UnresolvedArtifactInfo(
                    moduleGroup = root.name,
                    moduleName = "react-native-fake-module",
                    moduleVersion = "unspecified",
                    file = null,
                    isExpoPublishDependency = false,
                ),
            )

        val discovered = RncTransitiveDependencyDiscoverer(consumer).discover(artifacts)

        assertEquals(1, discovered.size)
        assertTrue(
            discovered.contains(
                DependencyInfo("androidx.appcompat", "appcompat", "1.7.1", "compile", false),
            ),
        )
        assertFalse(discovered.contains(DependencyInfo("com.facebook.react", "hermes-android", "0.87.0", "compile", false)))
        assertFalse(discovered.contains(DependencyInfo("com.facebook.react", "react-native", "+", "compile", false)))
        assertFalse(discovered.contains(DependencyInfo(root.name, "some-other-module", "unspecified", "compile", false)))
    }
}
