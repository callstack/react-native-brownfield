package com.callstack.react.brownfield.utils

import org.junit.jupiter.api.Test
import kotlin.test.assertFalse

class ExtensionTest {
    @Test
    fun `includeTransitiveDependencies defaults to false`() {
        assertFalse(Extension().includeTransitiveDependencies)
    }
}
