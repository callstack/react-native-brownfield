package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.shared.ExplodeAarTask
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class VariantTaskProviderTest {
    @Test
    fun `bundleTaskProvider resolves bundleVariant task when available`() {
        val project = ProjectBuilder.builder().build()
        val taskProvider = project.tasks.register("bundleDebug")

        val sut = VariantTaskProvider(project)
        val result = sut.bundleTaskProvider(project, "debug")

        assertEquals(taskProvider.get().name, result.get().name)
    }

    @Test
    fun `bundleTaskProvider falls back to bundleVariantAar task`() {
        val project = ProjectBuilder.builder().build()
        val taskProvider = project.tasks.register("bundleReleaseAar")

        val sut = VariantTaskProvider(project)
        val result = sut.bundleTaskProvider(project, "release")

        assertEquals(taskProvider.get().name, result.get().name)
    }

    @Test
    fun `preBuildTaskByVariant links explode task as dependency`() {
        val project = ProjectBuilder.builder().build()
        project.tasks.register("preDebugBuild")
        val explodeTaskProvider = project.tasks.register("explodeDebugAar", ExplodeAarTask::class.java)

        val sut = VariantTaskProvider(project)
        sut.preBuildTaskByVariant("Debug", explodeTaskProvider)

        val preBuild = project.tasks.getByName("preDebugBuild")
        assertTrue(preBuild.taskDependencies.getDependencies(preBuild).contains(explodeTaskProvider.get()))
    }
}
