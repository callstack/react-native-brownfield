package com.callstack.reactnativebrownfield

import java.util.concurrent.atomic.AtomicBoolean

/**
 * Runs a block at most once, counting only a run that completes.
 *
 * If the block throws, the next [run] call runs it again instead of treating
 * the work as done. Calls made while a run is in progress are skipped.
 */
internal class RetryableOnce {
    private val claimed = AtomicBoolean()

    /** Returns `true` when [block] ran and completed during this call. */
    fun run(block: () -> Unit): Boolean {
        if (claimed.getAndSet(true)) {
            return false
        }
        try {
            block()
        } catch (error: Throwable) {
            claimed.set(false)
            throw error
        }
        return true
    }
}
