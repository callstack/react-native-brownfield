package com.callstack.react.brownfield.utils

import org.junit.jupiter.api.Test
import kotlin.test.assertTrue

class ExtensionTest {
    @Test
    fun `experimentalIncludeTransitiveDependencies defaults to true`() {
        assertTrue(Extension().experimentalIncludeTransitiveDependencies)
    }

    @Test
    fun `dynamicLibs defaults to an empty list`() {
        assertTrue(Extension().dynamicLibs.isEmpty())
    }
}
