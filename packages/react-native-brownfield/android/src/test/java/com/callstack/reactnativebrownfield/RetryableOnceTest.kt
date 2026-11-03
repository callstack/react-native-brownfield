package com.callstack.reactnativebrownfield

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class RetryableOnceTest {
    @Test fun `runs the block once after it completes`() {
        val once = RetryableOnce()
        var runs = 0

        assertTrue(once.run { runs++ })
        assertFalse(once.run { runs++ })
        assertEquals(1, runs)
    }

    @Test fun `runs the block again after it throws`() {
        val once = RetryableOnce()
        var runs = 0

        try {
            once.run {
                runs++
                throw UnsatisfiedLinkError("dlopen failed")
            }
            fail("expected the error to propagate")
        } catch (expected: UnsatisfiedLinkError) {
            assertEquals("dlopen failed", expected.message)
        }

        assertTrue(once.run { runs++ })
        assertFalse(once.run { runs++ })
        assertEquals(2, runs)
    }
}
