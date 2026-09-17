package com.callstack.react.brownfield.expo

import com.callstack.react.brownfield.shared.VersionMediatingDependencySet
import org.gradle.api.Project
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ExpoPublishingHelperGradleFallbackTest {
    @Test
    fun `Gradle-fallback discovery picks up runtimeOnly dependencies`() {
        val root = ProjectBuilder.builder().build()
        val expoPkgProject = ProjectBuilder.builder().withParent(root).withName("expo-fake-module").build()

        expoPkgProject.configurations.create("implementation")
        expoPkgProject.configurations.create("api")
        expoPkgProject.configurations.create("runtimeOnly")
        expoPkgProject.dependencies.add("runtimeOnly", "androidx.annotation:annotation:1.9.1")

        val helper =
            object : ExpoPublishingHelper(brownfieldAppProject = root) {
                fun exposedAppend(
                    pkgProject: Project,
                    deps: VersionMediatingDependencySet,
                ) {
                    appendExpoTransitiveDependenciesFromGradle(pkgProject, deps)
                }
            }

        val discovered = VersionMediatingDependencySet()
        helper.exposedAppend(expoPkgProject, discovered)

        // Coordinate-only check: VersionMediatingDependencySet keys on groupId/artifactId, so
        // passing a scope here would be inert and would read as contradicting the scope
        // assertion below.
        assertTrue(
            discovered.any { it.groupId == "androidx.annotation" && it.artifactId == "annotation" },
            "expected the runtimeOnly dependency to be discovered via the Gradle fallback path",
        )
        assertEquals(
            "runtime",
            discovered.first { it.groupId == "androidx.annotation" }.scope,
            "runtimeOnly dependencies should be published under Maven's runtime scope, not compile",
        )
    }
}
