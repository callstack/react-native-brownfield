package com.callstack.react.brownfield.processors

import com.callstack.react.brownfield.shared.ExplodeAarTask
import com.callstack.react.brownfield.shared.UnresolvedArtifactInfo
import com.callstack.react.brownfield.utils.AndroidArchiveLibrary
import com.callstack.react.brownfield.utils.DirectoryManager
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlin.test.assertTrue

/**
 * A library that ships `implementation files("libs/some.jar")` has that jar in its exploded AAR's
 * `libs/`. Its classes must be merged with the library's own `classes.jar` (#489).
 */
class MergeClassesLocalJarsTest {
    @TempDir
    lateinit var tempDir: File

    @Test
    fun `merges classes from a library's local jars`() {
        val project = ProjectBuilder.builder().withProjectDir(tempDir).build()
        DirectoryManager.project = project

        val variantName = "release"
        val library =
            AndroidArchiveLibrary(
                project,
                UnresolvedArtifactInfo("RNApp", "react-native-aar-repro", "unspecified", null, false),
                variantName,
            )
        val explodeTask = project.tasks.register("explodeTest", ExplodeAarTask::class.java)
        val mergeTask = VariantTaskProvider(project).mergeClasses(listOf(library), explodeTask, variantName).get()

        // Exploded after the task is configured, as on a clean build.
        library.getExplodedAarRootDir().mkdirs()
        writeJar(library.getClassesJarFile(), "com/aarrepro/AarReproPackage.class")
        writeJar(
            File(library.getLibsDir(), "aar-repro.jar"),
            "com/aarrepro/jar/AarReproJarClass.class",
            "module-info.class",
        )

        mergeTask.run()

        val merged = mergeTask.outputDir.get().asFile
        assertTrue(File(merged, "com/aarrepro/AarReproPackage.class").exists(), "classes.jar was not merged")
        assertTrue(
            File(merged, "com/aarrepro/jar/AarReproJarClass.class").exists(),
            "classes from libs/aar-repro.jar were not merged",
        )
        val javacDir = File(tempDir, "build/intermediates/javac/release/compileReleaseJavaWithJavac/classes")
        assertTrue(File(javacDir, "com/aarrepro/jar/AarReproJarClass.class").exists(), "jar classes are not compiled into the AAR")
        assertTrue(!File(javacDir, "module-info.class").exists(), "a jar's module-info.class ended up in the AAR")
    }

    private fun writeJar(
        jar: File,
        vararg entries: String,
    ) {
        jar.parentFile.mkdirs()
        ZipOutputStream(jar.outputStream()).use { zip ->
            entries.forEach { entry ->
                zip.putNextEntry(ZipEntry(entry))
                zip.write(byteArrayOf(0xCA.toByte(), 0xFE.toByte(), 0xBA.toByte(), 0xBE.toByte()))
                zip.closeEntry()
            }
        }
    }
}
