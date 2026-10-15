package com.callstack.react.brownfield.shared

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class TransitiveDependencyFilteringTest {
    @Test
    fun `drops a hard-excluded coordinate the RNC discoverer found, even though it has no Expo awareness`() {
        // The RNC discoverer has no Expo blacklist, so an embedded module depending on an Expo
        // coordinate would otherwise be published as a Maven dependency that resolves nowhere.
        val transitiveDeps = VersionMediatingDependencySet()
        transitiveDeps.add(DependencyInfo("androidx.core", "core-ktx", "1.17.0", "compile", false))
        transitiveDeps.add(DependencyInfo("host.exp.exponent", "expo.modules.device", "56.0.4", "compile", false))

        val hardExcludePredicate: (String, String) -> Boolean = { groupId, _ -> groupId == "host.exp.exponent" }
        dropHardExcludedDependencies(transitiveDeps, hardExcludePredicate)

        assertTrue(transitiveDeps.contains(DependencyInfo("androidx.core", "core-ktx", "1.17.0", "compile", false)))
        assertFalse(transitiveDeps.any { it.groupId == "host.exp.exponent" })
        assertEquals(1, transitiveDeps.size)
    }

    @Test
    fun `does not drop a superseded coordinate that is meant to still be injected`() {
        // hardExcludePredicate must never include the supersede check, or a mediated
        // replacement for a consumer's stale hand-declared dependency would be dropped too.
        val transitiveDeps = VersionMediatingDependencySet()
        transitiveDeps.add(DependencyInfo("androidx.appcompat", "appcompat", "1.7.1", "compile", false))

        dropHardExcludedDependencies(transitiveDeps) { _, _ -> false }

        assertTrue(transitiveDeps.contains(DependencyInfo("androidx.appcompat", "appcompat", "1.7.1", "compile", false)))
        assertEquals(1, transitiveDeps.size)
    }
}
