package com.callstack.reactnativebrownfield

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class PerformanceMetricsTest {
    @Test fun `pairs markers and sorts overlapping timeline`() {
        val samples = JSBundleTimingAccumulator()
        samples.record(BundleMarker.EVALUATION_START, 1, 20)
        samples.record(BundleMarker.DOWNLOAD_START, 0, 10)
        samples.record(BundleMarker.EVALUATION_END, 1, 40)
        samples.record(BundleMarker.DOWNLOAD_END, 0, 30)

        val result = samples.snapshot()
        assertEquals(20.0, result.jsBundleLoadTime!!, 0.0)
        assertEquals(20.0, result.jsBundleEvaluationTime!!, 0.0)
        assertEquals(listOf("DOWNLOAD", "RUN_JS_BUNDLE"), result.timeline.map { it["tag"] })
    }

    @Test fun `keeps zero duration and rejects missing ambiguous and other instances`() {
        val zero = JSBundleTimingAccumulator().apply {
            record(BundleMarker.EVALUATION_START, 1, 5)
            record(BundleMarker.EVALUATION_END, 1, 5)
        }.snapshot()
        assertEquals(0.0, zero.jsBundleEvaluationTime!!, 0.0)

        val missing = JSBundleTimingAccumulator().apply {
            record(BundleMarker.DOWNLOAD_END, 0, 8)
            record(BundleMarker.EVALUATION_START, 2, 9)
            record(BundleMarker.EVALUATION_END, 2, 10)
        }.snapshot()
        assertNull(missing.jsBundleLoadTime)
        assertNull(missing.jsBundleEvaluationTime)

        val ambiguous = JSBundleTimingAccumulator().apply {
            record(BundleMarker.DOWNLOAD_START, 0, 1)
            record(BundleMarker.DOWNLOAD_START, 0, 2)
            record(BundleMarker.DOWNLOAD_END, 0, 3)
        }.snapshot()
        assertNull(ambiguous.jsBundleLoadTime)
    }

    @Test fun `frame accumulator includes unfinished deadline excess`() {
        val samples = BrownfieldFrameSamples()
        samples.begin(0)
        samples.record(20_000_000, 10_000_000)
        val result = samples.snapshot(50_000_000)
        assertEquals(20.0, result.fps!!, 0.001)
        assertEquals(0.6, result.busyRatio!!, 0.001)
        assertEquals(50.0, result.sampledMs, 0.001)
        assertEquals(1, result.frameCount)
    }
}
