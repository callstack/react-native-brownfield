package com.callstack.react.brownfield.shared

import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class TransitiveDependencyFilteringTest {
    @Test
    fun `drops a hard-excluded coordinate the RNC discoverer found, even though it has no Expo awareness`() {
        // Regression test: RncTransitiveDependencyDiscoverer has no concept of the Expo
        // blacklist, so an embedded non-Expo module legitimately depending on one of Expo's own
        // module coordinates (e.g. host.exp.exponent:expo.modules.device) would otherwise get
        // published as an external Maven dependency that doesn't actually resolve anywhere.
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
