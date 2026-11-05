package com.callstack.react.brownfield.plugin

import com.callstack.react.brownfield.shared.gradleExcludes
import org.gradle.testfixtures.ProjectBuilder
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class HardExcludePredicateTest {
    @TempDir
    lateinit var tempDir: File

    @Test
    fun `never publishes what the brownfield module excludes, or its own subprojects`() {
        val root = ProjectBuilder.builder().withName("MyApp").withProjectDir(tempDir).build()
        val lib = ProjectBuilder.builder().withName("brownfieldlib").withParent(root).build()
        lib.configurations.create("implementation")
        lib.configurations.all { it.exclude(mapOf("group" to "com.caverock", "module" to "androidsvg")) }

        val excluded = hardExcludePredicate(lib, null, emptyList(), emptyList(), gradleExcludes(lib))

        assertTrue(excluded("com.caverock", "androidsvg"))
        assertTrue(excluded("MyApp", "react-native-screens"))
        assertFalse(excluded("androidx.core", "core-ktx"))
    }
}
