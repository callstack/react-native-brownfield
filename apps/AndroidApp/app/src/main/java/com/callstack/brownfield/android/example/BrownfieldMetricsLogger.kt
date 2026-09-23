package com.callstack.brownfield.android.example

import android.util.Log
import com.callstack.reactnativebrownfield.BrownfieldDisplayInterval
import com.callstack.reactnativebrownfield.BrownfieldDisplayMetrics
import com.callstack.reactnativebrownfield.BrownfieldThreadMetrics
import com.callstack.reactnativebrownfield.JSBundleTimings

object BrownfieldMetricsLogger {
    private const val TAG = "AndroidApp"

    fun logStartup(timings: JSBundleTimings) {
        Log.i(
            TAG,
            "[startup] jsBundleLoadTime=${number(timings.jsBundleLoadTime)} " +
                "jsBundleEvaluationTime=${number(timings.jsBundleEvaluationTime)}"
        )
        for (interval in timings.timeline) {
            val marker = interval["tag"] as? String ?: "unknown"
            Log.i(
                TAG,
                "[startup][$marker] startMs=${number(interval["startMs"])} " +
                    "stopMs=${number(interval["stopMs"])}"
            )
        }
    }

    fun logDisplay(metrics: BrownfieldDisplayMetrics) {
        val label = "[${metrics.moduleName}][ Display Event ]"
        metrics.initialDisplay?.let { logInterval(it, "$label[TTID]") }
        metrics.fullDisplay?.let { logInterval(it, "$label[TTFD]") }
    }

    private fun logInterval(interval: BrownfieldDisplayInterval, label: String) {
        Log.i(
            TAG,
            "$label duration=${format(interval.duration)} " +
                "JS={${thread(interval.jsThread)}} UI={${thread(interval.uiThread)}}"
        )
    }

    private fun thread(metrics: BrownfieldThreadMetrics): String {
        return "fps=${number(metrics.fps)} busyRatio=${number(metrics.busyRatio)} " +
            "sampledMs=${format(metrics.sampledMs)} frames=${metrics.frameCount}"
    }

    private fun number(value: Any?): String = when (value) {
        null -> "unavailable"
        is Double -> format(value)
        is Float -> format(value.toDouble())
        is Long -> format(value.toDouble())
        is Int -> format(value.toDouble())
        is Number -> format(value.toDouble())
        else -> value.toString()
    }

    private fun format(value: Double): String = "%.2f".format(value)
}
