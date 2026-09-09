package com.callstack.react.brownfield.expo

import com.callstack.react.brownfield.shared.DependencyInfo
import com.callstack.react.brownfield.shared.VersionMediatingDependencySet
import org.gradle.api.Project
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
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

        assertTrue(
            discovered.contains(
                DependencyInfo("androidx.annotation", "annotation", "1.9.1", "compile", false),
            ),
            "expected the runtimeOnly dependency to be discovered via the Gradle fallback path",
        )
    }
}
