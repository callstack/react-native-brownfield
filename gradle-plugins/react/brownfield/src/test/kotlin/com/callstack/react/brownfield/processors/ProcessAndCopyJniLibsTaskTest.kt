package com.callstack.react.brownfield.processors

import org.gradle.api.tasks.InputDirectory
import org.gradle.api.tasks.InputFiles
import org.gradle.api.tasks.Optional
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ProcessAndCopyJniLibsTaskTest {
    @TempDir
    lateinit var tempDir: File

    private val out by lazy { File(tempDir, "out") }
    private val report by lazy { File(tempDir, "reports/skipped-so.txt") }

    private fun so(
        root: File,
        abi: String,
        name: String,
        content: String = name,
    ): File =
        File(root, "$abi/$name").apply {
            parentFile.mkdirs()
            writeText(content)
        }

    private fun runTask(
        aars: List<File>,
        appDir: File,
        extraIgnored: List<String> = emptyList(),
        dynamic: List<String> = emptyList(),
    ) {
        val project = ProjectBuilder.builder().withProjectDir(File(tempDir, "project")).build()
        val task = project.tasks.register("processJniForTest", ProcessAndCopyJniLibsTask::class.java).get()
        task.aarJniDirs.setFrom(aars)
        task.appNativeLibsDir.set(appDir)
        task.extraIgnoredLibs.set(extraIgnored)
        task.dynamicLibs.set(dynamic)
        task.outputDirectory.set(out)
        task.skippedReportFile.set(report)
        task.execute()
    }

    private fun outFiles(): Set<String> = out.walkTopDown().filter { it.isFile }.map { it.relativeTo(out).invariantSeparatorsPath }.toSet()

    @Test
    fun `copies the plan and clears stale output`() {
        so(out, "arm64-v8a", "libold.so")
        val app = File(tempDir, "app")
        val aar = File(tempDir, "aar")
        so(app, "arm64-v8a", "libappmodules.so", "app-bytes")
        val aarLib = so(aar, "arm64-v8a", "libfoo.so", "aar-bytes")

        runTask(listOf(aar), app)

        assertEquals(setOf("arm64-v8a/libappmodules.so", "arm64-v8a/libfoo.so"), outFiles())
        assertEquals("app-bytes", File(out, "arm64-v8a/libappmodules.so").readText())
        assertEquals("aar-bytes", File(out, "arm64-v8a/libfoo.so").readText())
        assertTrue(aarLib.exists(), "inputs must not be modified")
    }

    @Test
    fun `works when the app dir does not exist`() {
        val aar = File(tempDir, "aar")
        so(aar, "arm64-v8a", "libfoo.so")

        runTask(listOf(aar), File(tempDir, "missing"))

        assertEquals(setOf("arm64-v8a/libfoo.so"), outFiles())
    }

    @Test
    fun `writes the skipped report`() {
        val app = File(tempDir, "app")
        val aar = File(tempDir, "aar")
        so(app, "arm64-v8a", "libQmBlur.so")
        so(aar, "arm64-v8a", "libreactnative.so")

        runTask(listOf(aar), app)

        val lines = report.readLines()
        val expectedFirst = skippedSummary(planJniLibs(listOf(aar), app, IGNORE_EMBEDDED_LIBS, emptyList()), null)
        assertEquals(expectedFirst, lines.first())
        assertTrue("libQmBlur.so: NOT_EMBEDDED" in lines, lines.toString())
        assertTrue("libreactnative.so: IGNORED" in lines, lines.toString())
    }

    @Test
    fun `writes the skipped report when nothing is skipped`() {
        val app = File(tempDir, "app")
        so(app, "arm64-v8a", "libappmodules.so")

        runTask(emptyList(), app)

        assertEquals(listOf("No .so files were left out."), report.readLines())
    }

    @Test
    fun `applies ignoreEmbeddedLibs and dynamicLibs`() {
        val app = File(tempDir, "app")
        val aar = File(tempDir, "aar")
        so(app, "arm64-v8a", "libmmkv.so")
        so(aar, "arm64-v8a", "libdatadog-ndk.so")
        so(aar, "arm64-v8a", "libfoo.so")

        runTask(listOf(aar), app, extraIgnored = listOf("libdatadog"), dynamic = listOf("libmmkv.so"))

        assertEquals(setOf("arm64-v8a/libmmkv.so", "arm64-v8a/libfoo.so"), outFiles())
        assertTrue("libdatadog-ndk.so: IGNORED" in report.readLines())
    }

    @Test
    fun `app dir is not declared as an InputDirectory`() {
        val getter = ProcessAndCopyJniLibsTask::class.java.getMethod("getAppNativeLibsDir")

        assertTrue(getter.isAnnotationPresent(InputFiles::class.java))
        assertTrue(getter.isAnnotationPresent(Optional::class.java))
        assertFalse(getter.isAnnotationPresent(InputDirectory::class.java))
    }

    @Test
    fun `runs after the task that unpacks the embedded AARs`() {
        val project = ProjectBuilder.builder().withProjectDir(File(tempDir, "project")).build()
        val explode = project.tasks.register("explodeDebugAar")
        val task = project.tasks.register("processJniForTest", ProcessAndCopyJniLibsTask::class.java).get()

        wireAarJniDirs(task, listOf(File(tempDir, "exploded/jni")), explode)

        assertTrue(explode.get() in task.taskDependencies.getDependencies(task))
    }
}
