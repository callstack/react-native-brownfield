package com.callstack.react.brownfield.shared

import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class DependencyPublishabilityTest {
    @Test
    fun `rejects a fully dynamic version`() {
        val dep = DependencyInfo("com.facebook.react", "react-native", "+", "compile", false)
        assertFalse(isPublishableCoordinate(dep))
    }

    @Test
    fun `rejects a partially dynamic version`() {
        val dep = DependencyInfo("androidx.core", "core-ktx", "1.+", "compile", false)
        assertFalse(isPublishableCoordinate(dep))
    }

    @Test
    fun `rejects a null version`() {
        val dep = DependencyInfo("com.facebook.react", "react-android", null, "compile", false)
        assertFalse(isPublishableCoordinate(dep))
    }

    @Test
    fun `rejects a blank version`() {
        val dep = DependencyInfo("com.facebook.react", "react-android", "  ", "compile", false)
        assertFalse(isPublishableCoordinate(dep))
    }

    @Test
    fun `accepts a normal pinned version`() {
        val dep = DependencyInfo("androidx.appcompat", "appcompat", "1.7.1", "compile", false)
        assertTrue(isPublishableCoordinate(dep))
    }

    @Test
    fun `rejects latest_release`() {
        val dep = DependencyInfo("androidx.core", "core-ktx", "latest.release", "compile", false)
        assertFalse(isPublishableCoordinate(dep))
    }

    @Test
    fun `rejects latest_integration`() {
        val dep = DependencyInfo("androidx.core", "core-ktx", "latest.integration", "compile", false)
        assertFalse(isPublishableCoordinate(dep))
    }

    @Test
    fun `rejects a closed Maven version range`() {
        val dep = DependencyInfo("androidx.core", "core-ktx", "[1.0,2.0]", "compile", false)
        assertFalse(isPublishableCoordinate(dep))
    }

    @Test
    fun `rejects a half-open Maven version range`() {
        val dep = DependencyInfo("androidx.core", "core-ktx", "[1.0,2.0)", "compile", false)
        assertFalse(isPublishableCoordinate(dep))
    }

    @Test
    fun `rejects an unbounded Maven version range`() {
        val dep = DependencyInfo("androidx.core", "core-ktx", "[1.0,)", "compile", false)
        assertFalse(isPublishableCoordinate(dep))
    }
}
