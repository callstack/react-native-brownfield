package com.callstack.react.brownfield.shared

import org.gradle.api.Project
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class GradleExcludesTest {
    @TempDir
    lateinit var tempDir: File

    private fun project(
        name: String,
        vararg configNames: String,
    ): Project =
        ProjectBuilder.builder().withName(name).withProjectDir(File(tempDir, name)).build().also { project ->
            configNames.forEach { project.configurations.create(it) }
        }

    private fun Project.excludeEverywhere(
        group: String,
        module: String? = null,
    ) = configurations.all { config ->
        config.exclude(listOfNotNull("group" to group, module?.let { "module" to it }).toMap())
    }

    private fun excluded(
        project: Project,
        groupId: String,
        artifactId: String,
    ) = gradleExcludes(project).any { it.matches(groupId, artifactId) }

    @Test
    fun `honors an exclude declared on every configuration`() {
        val lib = project("lib", "implementation", "releaseRuntimeClasspath")
        lib.excludeEverywhere("com.caverock", "androidsvg")

        assertTrue(excluded(lib, "com.caverock", "androidsvg"))
        assertFalse(excluded(lib, "com.caverock", "androidsvg-aar"))
    }

    @Test
    fun `a group-only exclude matches every module of the group`() {
        val lib = project("lib", "api")
        lib.excludeEverywhere("com.caverock")

        assertTrue(excluded(lib, "com.caverock", "androidsvg-aar"))
    }

    @Test
    fun `ignores a variant-specific exclude`() {
        val lib = project("lib", "implementation", "debugRuntimeClasspath")
        lib.configurations.getByName("debugRuntimeClasspath").exclude(mapOf("group" to "com.caverock"))

        assertFalse(excluded(lib, "com.caverock", "androidsvg"))
    }

    @Test
    fun `honors an exclude on a single runtime configuration`() {
        val lib = project("lib", "embed")
        lib.configurations.getByName("embed").exclude(mapOf("group" to "com.caverock", "module" to "androidsvg"))

        assertTrue(excluded(lib, "com.caverock", "androidsvg"))
    }

    @Test
    fun `ignores configurations that do not feed the runtime`() {
        val lib = project("lib", "implementation", "detekt")
        lib.configurations.getByName("detekt").exclude(mapOf("group" to "org.jetbrains.kotlin"))

        assertFalse(excluded(lib, "org.jetbrains.kotlin", "kotlin-stdlib"))
    }

    @Test
    fun `matches nothing without excludes`() {
        assertFalse(excluded(project("lib", "implementation"), "com.caverock", "androidsvg"))
    }
}
