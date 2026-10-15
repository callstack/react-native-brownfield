package com.callstack.react.brownfield.artifacts

import com.callstack.react.brownfield.shared.DependencyInfo
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RncTransitiveDependencyDiscovererTest {
    private fun defaultArtifacts(root: org.gradle.api.Project) =
        listOf(
            UnresolvedArtifactInfo(
                moduleGroup = root.name,
                moduleName = "react-native-fake-module",
                moduleVersion = "unspecified",
                file = null,
                isExpoPublishDependency = false,
            ),
        )

    @Test
    fun `a dynamic consumer-declared version never becomes a mediation candidate`() {
        // Module-side versions are validated by collectPublishableGradleDependencies; the
        // consumer side must be validated too, or `1.+` can win mediation and be published.
        val root = ProjectBuilder.builder().build()
        val consumer = ProjectBuilder.builder().withParent(root).withName("BrownfieldLib").build()
        val embeddedModule = ProjectBuilder.builder().withParent(root).withName("react-native-fake-module").build()

        embeddedModule.configurations.create("implementation")
        embeddedModule.dependencies.add("implementation", "androidx.appcompat:appcompat:1.0.0")

        consumer.configurations.create("implementation")
        consumer.dependencies.add("implementation", "androidx.appcompat:appcompat:1.+")

        val result = RncTransitiveDependencyDiscoverer(consumer).discover(defaultArtifacts(root))

        val appcompat = result.dependencies.first { it.groupId == "androidx.appcompat" }
        assertEquals("1.0.0", appcompat.version, "the dynamic consumer version must not win mediation")
        assertFalse(result.dependencies.any { it.version == "1.+" }, "'1.+' must never reach the published set")
    }

    @Test
    fun `a versionless consumer declaration still supersedes, so the coordinate is not duplicated`() {
        // Declared via BOM/platform, so `.version` is null. A version-only lookup returns null
        // here, never marks the coordinate superseded, and leaves two entries for it in the POM.
        val root = ProjectBuilder.builder().build()
        val consumer = ProjectBuilder.builder().withParent(root).withName("BrownfieldLib").build()
        val embeddedModule = ProjectBuilder.builder().withParent(root).withName("react-native-fake-module").build()

        embeddedModule.configurations.create("implementation")
        embeddedModule.dependencies.add("implementation", "androidx.appcompat:appcompat:1.7.1")

        consumer.configurations.create("implementation")
        consumer.dependencies.add("implementation", "androidx.appcompat:appcompat")

        val result = RncTransitiveDependencyDiscoverer(consumer).discover(defaultArtifacts(root))

        assertTrue(
            result.supersededCoordinates.contains("androidx.appcompat" to "appcompat"),
            "a declared-but-versionless coordinate must still be superseded",
        )
        assertEquals("1.7.1", result.dependencies.first { it.groupId == "androidx.appcompat" }.version)
    }

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
        embeddedModule.dependencies.add("implementation", "com.facebook.react:react-native:+")
        embeddedModule.dependencies.add("runtimeOnly", "androidx.annotation:annotation:1.9.1")
        embeddedModule.dependencies.add(
            "implementation",
            embeddedModule.dependencies.project(mapOf("path" to siblingProject.path)),
        )

        consumer.configurations.create("api")

        val result = RncTransitiveDependencyDiscoverer(consumer).discover(defaultArtifacts(root))
        val discovered = result.dependencies

        assertEquals(2, discovered.size)
        assertTrue(
            discovered.contains(
                DependencyInfo("androidx.appcompat", "appcompat", "1.7.1", "compile", false),
            ),
        )
        assertTrue(
            discovered.contains(
                DependencyInfo("androidx.annotation", "annotation", "1.9.1", "runtime", false),
            ),
        )
        assertFalse(discovered.contains(DependencyInfo("com.facebook.react", "react-native", "+", "compile", false)))
        assertFalse(discovered.contains(DependencyInfo(root.name, "some-other-module", "unspecified", "compile", false)))
        assertTrue(result.supersededCoordinates.isEmpty())
    }

    @Test
    fun `publishes a runtimeOnly dependency under Maven runtime scope, not compile`() {
        val root = ProjectBuilder.builder().build()
        val consumer = ProjectBuilder.builder().withParent(root).withName("BrownfieldLib").build()
        val embeddedModule = ProjectBuilder.builder().withParent(root).withName("react-native-fake-module").build()

        embeddedModule.configurations.create("implementation")
        embeddedModule.configurations.create("api")
        embeddedModule.configurations.create("runtimeOnly")
        embeddedModule.dependencies.add("runtimeOnly", "androidx.annotation:annotation:1.9.1")

        val discovered = RncTransitiveDependencyDiscoverer(consumer).discover(defaultArtifacts(root)).dependencies

        val annotationDep = discovered.first { it.groupId == "androidx.annotation" }
        assertEquals("runtime", annotationDep.scope)
    }

    @Test
    fun `a module's higher version requirement wins over, and supersedes, the consumer's own lower declaration`() {
        val root = ProjectBuilder.builder().build()
        val consumer = ProjectBuilder.builder().withParent(root).withName("BrownfieldLib").build()
        val embeddedModule = ProjectBuilder.builder().withParent(root).withName("react-native-fake-module").build()

        embeddedModule.configurations.create("implementation")
        embeddedModule.configurations.create("api")
        embeddedModule.configurations.create("runtimeOnly")
        embeddedModule.dependencies.add("implementation", "androidx.appcompat:appcompat:1.7.1")

        consumer.configurations.create("api")
        consumer.dependencies.add("api", "androidx.appcompat:appcompat:1.6.0")

        val result = RncTransitiveDependencyDiscoverer(consumer).discover(defaultArtifacts(root))

        val appcompatDep = result.dependencies.first { it.groupId == "androidx.appcompat" }
        assertEquals("1.7.1", appcompatDep.version, "the module's higher requirement must win mediation")
        assertTrue(
            result.supersededCoordinates.contains("androidx.appcompat" to "appcompat"),
            "the consumer's stale lower-version entry must be marked for replacement",
        )
    }

    @Test
    fun `does not regress or supersede when the consumer's own version already satisfies the module`() {
        val root = ProjectBuilder.builder().build()
        val consumer = ProjectBuilder.builder().withParent(root).withName("BrownfieldLib").build()
        val embeddedModule = ProjectBuilder.builder().withParent(root).withName("react-native-fake-module").build()

        embeddedModule.configurations.create("implementation")
        embeddedModule.configurations.create("api")
        embeddedModule.configurations.create("runtimeOnly")
        embeddedModule.dependencies.add("implementation", "androidx.appcompat:appcompat:1.6.0")

        consumer.configurations.create("api")
        consumer.dependencies.add("api", "androidx.appcompat:appcompat:1.7.1")

        val result = RncTransitiveDependencyDiscoverer(consumer).discover(defaultArtifacts(root))

        val appcompatDep = result.dependencies.first { it.groupId == "androidx.appcompat" }
        assertEquals("1.7.1", appcompatDep.version, "the consumer's already-higher version must be preserved, not downgraded")
        assertTrue(
            result.supersededCoordinates.contains("androidx.appcompat" to "appcompat"),
            "still marked superseded so the injector re-declares it at the mediated (unchanged) version instead of duplicating it",
        )
    }
}
