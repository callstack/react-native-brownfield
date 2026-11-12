package com.callstack.react.brownfield.processors

import org.gradle.api.DefaultTask
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.tasks.OutputDirectory
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertTrue

abstract class FakeBundleTask : DefaultTask() {
    @get:OutputDirectory
    abstract val resourcesDir: DirectoryProperty
}

class MetroResDirWiringTest {
    @TempDir
    lateinit var tempDir: File

    @Test
    fun `treats Metro's res output as the module's own and runs after the bundle`() {
        val root = ProjectBuilder.builder().withProjectDir(tempDir).build()
        val app = ProjectBuilder.builder().withName("app").withParent(root).build()
        val lib = ProjectBuilder.builder().withName("BrownfieldLib").withParent(root).build()
        val metroDir = File(tempDir, "app/build/generated/res/react/release")
        val bundle =
            app.tasks.register("createBundleReleaseJsAndAssets", FakeBundleTask::class.java) {
                it.resourcesDir.set(metroDir)
            }
        val copy = lib.tasks.register("copyExplodedResForRelease", CopyExplodedResTask::class.java).get()

        wireMetroResDir(copy, app, "createBundleReleaseJsAndAssets")

        assertEquals(setOf(metroDir), copy.moduleResDirs.files)
        assertTrue(bundle.get() in copy.taskDependencies.getDependencies(copy))
    }
}
