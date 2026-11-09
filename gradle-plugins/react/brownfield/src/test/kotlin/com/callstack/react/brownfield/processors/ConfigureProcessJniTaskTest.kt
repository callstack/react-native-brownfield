package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.utils.Extension
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ConfigureProcessJniTaskTest {
    @TempDir
    lateinit var tempDir: File

    private fun configure(useStripped: Boolean): Pair<ProcessAndCopyJniLibsTask, File> {
        val root = ProjectBuilder.builder().withProjectDir(tempDir).build()
        val app = ProjectBuilder.builder().withName("app").withParent(root).build()
        val lib = ProjectBuilder.builder().withName("BrownfieldLib").withParent(root).build()
        val ext =
            Extension().apply {
                useStrippedSoFiles = useStripped
                ignoreEmbeddedLibs = listOf("libdatadog")
                dynamicLibs = listOf("libmmkv.so")
            }
        val explode = lib.tasks.register("explodeDevReleaseAar")
        val task = lib.tasks.register("processJni", ProcessAndCopyJniLibsTask::class.java).get()

        configureProcessJniTask(task, lib, app, ext, "devRelease", listOf(File(tempDir, "jni")), explode)
        return task to app.layout.buildDirectory.get().asFile
    }

    @Test
    fun `wires the stripped source, settings and report path`() {
        val (task, appBuild) = configure(useStripped = true)

        assertEquals(
            File(appBuild, "intermediates/stripped_native_libs/devRelease/stripDevReleaseDebugSymbols/out/lib"),
            task.appNativeLibsDir.get().asFile,
        )
        assertTrue(":app:stripDevReleaseDebugSymbols" in task.dependsOn, task.dependsOn.toString())
        assertTrue(":BrownfieldLib:generateCodegenSchemaFromJavaScript" in task.dependsOn, task.dependsOn.toString())
        assertEquals(listOf("libdatadog"), task.extraIgnoredLibs.get())
        assertEquals(listOf("libmmkv.so"), task.dynamicLibs.get())
        assertTrue(
            task.skippedReportFile.get().asFile.invariantSeparatorsPath
                .endsWith("BrownfieldLib/build/reports/brownfield/devRelease/skipped-so.txt"),
        )
    }

    @Test
    fun `wires the unstripped source`() {
        val (task, appBuild) = configure(useStripped = false)

        assertEquals(
            File(appBuild, "intermediates/merged_native_libs/devRelease/mergeDevReleaseNativeLibs/out/lib"),
            task.appNativeLibsDir.get().asFile,
        )
        assertTrue(":app:mergeDevReleaseNativeLibs" in task.dependsOn, task.dependsOn.toString())
    }
}
