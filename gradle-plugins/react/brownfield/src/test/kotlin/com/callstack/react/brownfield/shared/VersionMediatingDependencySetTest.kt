package com.callstack.react.brownfield.shared

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class VersionMediatingDependencySetTest {

    @Test
    fun `keeps the higher version when the same coordinate is added twice`() {
        val set = VersionMediatingDependencySet()

        set.add(DependencyInfo("androidx.appcompat", "appcompat", "1.6.0", "compile", false))
        set.add(DependencyInfo("androidx.appcompat", "appcompat", "1.7.1", "compile", false))

        assertEquals(1, set.size)
        assertTrue(set.contains(DependencyInfo("androidx.appcompat", "appcompat", "1.7.1", "compile", false)))
    }

    @Test
    fun `does not downgrade when a lower version is added second`() {
        val set = VersionMediatingDependencySet()

        set.add(DependencyInfo("androidx.appcompat", "appcompat", "1.7.1", "compile", false))
        set.add(DependencyInfo("androidx.appcompat", "appcompat", "1.6.0", "compile", false))

        val kept = set.first { it.groupId == "androidx.appcompat" }
        assertEquals("1.7.1", kept.version)
    }

    @Test
    fun `removeAll removes matching entries and returns them`() {
        val set = VersionMediatingDependencySet()
        set.add(DependencyInfo("host.exp.exponent", "expo", "1.0.0", "compile", false))
        set.add(DependencyInfo("androidx.core", "core-ktx", "1.17.0", "compile", false))

        val removed = set.removeAll { it.groupId == "host.exp.exponent" }

        assertEquals(1, removed.size)
        assertEquals(1, set.size)
        assertTrue(set.contains(DependencyInfo("androidx.core", "core-ktx", "1.17.0", "compile", false)))
    }
}
