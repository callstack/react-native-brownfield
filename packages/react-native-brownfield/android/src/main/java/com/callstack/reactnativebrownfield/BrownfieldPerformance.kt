package com.callstack.reactnativebrownfield

import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.Choreographer
import android.view.View
import com.facebook.react.ReactHost
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants
import java.util.Collections
import java.util.UUID

class JSBundleTimings @JvmOverloads constructor(
    val jsBundleLoadTime: Double?,
    val jsBundleEvaluationTime: Double?,
    timeline: List<Map<String, Any>> = emptyList()
) {
    val timeline: List<Map<String, Any>> = Collections.unmodifiableList(
        timeline.map { Collections.unmodifiableMap(HashMap(it)) }
    )
}

fun interface OnDisplayMetrics {
    fun onMetrics(metrics: BrownfieldDisplayMetrics)
}

data class BrownfieldThreadMetrics(
    val fps: Double?,
    val busyRatio: Double?,
    val sampledMs: Double,
    val frameCount: Int
)

data class BrownfieldDisplayInterval(
    val duration: Double,
    val jsThread: BrownfieldThreadMetrics,
    val uiThread: BrownfieldThreadMetrics
)

data class BrownfieldDisplayMetrics(
    val presentationID: String,
    val moduleName: String,
    val initialDisplay: BrownfieldDisplayInterval?,
    val fullDisplay: BrownfieldDisplayInterval?,
    val isFinal: Boolean,
    val isCancelled: Boolean = false
)

internal class BrownfieldFrameSamples {
    private var startNanos: Long? = null
    private var lastNanos = 0L
    private var budgetNanos = 1_000_000_000L / 60
    private var frames = 0
    private var busyNanos = 0L

    @Synchronized
    fun begin(nowNanos: Long) {
        if (startNanos == null) {
            startNanos = nowNanos
            lastNanos = nowNanos
        }
    }

    @Synchronized
    fun record(nowNanos: Long, frameIntervalNanos: Long) {
        if (startNanos == null) begin(nowNanos)
        budgetNanos = frameIntervalNanos.coerceAtLeast(1_000_000_000L / 240)
        busyNanos += (nowNanos - lastNanos - budgetNanos).coerceAtLeast(0)
        frames += 1
        lastNanos = nowNanos
    }

    @Synchronized
    fun snapshot(nowNanos: Long): BrownfieldThreadMetrics {
        val start = startNanos
        if (start == null || nowNanos <= start) {
            return BrownfieldThreadMetrics(null, null, 0.0, 0)
        }
        val elapsed = nowNanos - start
        val unfinishedStall = (nowNanos - lastNanos - budgetNanos).coerceAtLeast(0)
        return BrownfieldThreadMetrics(
            fps = frames * 1_000_000_000.0 / elapsed,
            busyRatio = ((busyNanos + unfinishedStall).toDouble() / elapsed).coerceAtMost(1.0),
            sampledMs = elapsed / 1_000_000.0,
            frameCount = frames
        )
    }
}

internal class BrownfieldFrameSampler {
    private val samples = BrownfieldFrameSamples()
    @Volatile private var stopped = false
    private var choreographer: Choreographer? = null

    private val callback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (stopped) return
            val now = SystemClock.elapsedRealtimeNanos()
            val interval = ReactNativeBrownfield.displayFrameIntervalNanos()
            samples.record(now, interval)
            choreographer?.postFrameCallback(this)
        }
    }

    fun startOnCurrentLooper() {
        if (stopped || choreographer != null || Looper.myLooper() == null) return
        samples.begin(SystemClock.elapsedRealtimeNanos())
        choreographer = Choreographer.getInstance().also { it.postFrameCallback(callback) }
    }

    fun snapshot(nowNanos: Long) = samples.snapshot(nowNanos)

    fun stop() {
        stopped = true
        choreographer?.removeFrameCallback(callback)
        choreographer = null
    }
}

internal object BrownfieldPresentationRegistry {
    private val sessions = mutableMapOf<String, BrownfieldDisplaySession>()

    @Synchronized fun add(session: BrownfieldDisplaySession) { sessions[session.id] = session }
    @Synchronized fun remove(id: String) { sessions.remove(id) }
    @Synchronized fun mark(id: String) { sessions[id]?.markFullyDisplayed() }
    @Synchronized fun cancelAll() { sessions.values.toList().forEach { it.cancel() }; sessions.clear() }
}

internal class BrownfieldDisplaySession(
    val moduleName: String,
    private val waitForFullDisplay: Boolean,
    collectThreadMetrics: Boolean,
    callback: OnDisplayMetrics?
) {
    val id: String = UUID.randomUUID().toString()
    private val main = Handler(Looper.getMainLooper())
    private val startNanos = SystemClock.elapsedRealtimeNanos()
    private var completion = callback
    private val ui = if (collectThreadMetrics && callback != null) BrownfieldFrameSampler() else null
    private val js = if (collectThreadMetrics && callback != null) BrownfieldFrameSampler() else null
    private var initial: BrownfieldDisplayInterval? = null
    private var marked = false
    private var attached = false
    private var resumed = true
    @Volatile private var finished = callback == null
    private var boundRoot: View? = null
    private var attachmentListener: View.OnAttachStateChangeListener? = null
    private var contextListener: ReactInstanceEventListener? = null

    init {
        if (!finished) {
            BrownfieldPresentationRegistry.add(this)
            main.post { if (!finished) ui?.startOnCurrentLooper() }
            scheduleJS()
        }
    }

    private fun scheduleJS() {
        if (js == null || finished) return
        val context = ReactNativeBrownfield.currentReactContext()
        if (context != null) {
            context.runOnJSQueueThread { if (!finished) js.startOnCurrentLooper() }
            return
        }
        val host = ReactNativeBrownfield.shared.reactHost
        val listener = object : ReactInstanceEventListener {
            override fun onReactContextInitialized(context: ReactContext) {
                host.removeReactInstanceEventListener(this)
                contextListener = null
                context.runOnJSQueueThread { if (!finished) js.startOnCurrentLooper() }
            }
        }
        contextListener = listener
        host.addReactInstanceEventListener(listener)
    }

    fun bind(root: View, requiresResume: Boolean) {
        resumed = !requiresResume
        val listener = object : View.OnAttachStateChangeListener {
            override fun onViewAttachedToWindow(view: View) {
                attached = true
                main.post { maybeAppear(view) }
            }
            override fun onViewDetachedFromWindow(view: View) {
                if (attached) cancel()
                view.removeOnAttachStateChangeListener(this)
            }
        }
        boundRoot = root
        attachmentListener = listener
        root.addOnAttachStateChangeListener(listener)
        if (root.isAttachedToWindow) {
            attached = true
            main.post { maybeAppear(root) }
        }
    }

    fun setResumed(value: Boolean) {
        resumed = value
        if (!value && attached && initial == null) cancel() else if (value) main.post { maybeAppear(null) }
    }

    private fun maybeAppear(root: View?) {
        if (finished || !attached || !resumed || initial != null || (root != null && !root.isAttachedToWindow)) return
        initial = interval()
        if (!waitForFullDisplay || marked) complete()
    }

    fun markFullyDisplayed() {
        main.post {
            if (finished || marked) return@post
            marked = true
            if (initial != null) complete()
        }
    }

    private fun interval(): BrownfieldDisplayInterval {
        val now = SystemClock.elapsedRealtimeNanos()
        val unavailable = BrownfieldThreadMetrics(null, null, 0.0, 0)
        return BrownfieldDisplayInterval(
            duration = (now - startNanos) / 1_000_000.0,
            jsThread = js?.snapshot(now) ?: unavailable,
            uiThread = ui?.snapshot(now) ?: unavailable
        )
    }

    private fun complete() {
        val first = initial ?: return
        val full = if (waitForFullDisplay) interval() else first
        finished = true
        val callback = completion
        completion = null
        stop()
        main.post { callback?.onMetrics(BrownfieldDisplayMetrics(id, moduleName, first, full, true)) }
    }

    fun cancel() {
        main.post {
            if (finished) return@post
            finished = true
            completion = null
            stop()
        }
    }

    private fun stop() {
        BrownfieldPresentationRegistry.remove(id)
        attachmentListener?.let { boundRoot?.removeOnAttachStateChangeListener(it) }
        attachmentListener = null
        boundRoot = null
        contextListener?.let {
            ReactNativeBrownfield.shared.reactHost.removeReactInstanceEventListener(it)
        }
        contextListener = null
        ui?.stop()
        js?.stop()
    }
}

internal object AndroidJSBundleTimingObserver {
    private val main = Handler(Looper.getMainLooper())
    private var generation = 0
    private var accumulator = JSBundleTimingAccumulator()
    private var result: JSBundleTimings? = null
    private val subscribers = mutableListOf<OnJSBundleLoaded>()
    private var installed = false

    private val markerListener = ReactMarker.MarkerListener { name, _, instanceKey ->
        val now = SystemClock.elapsedRealtime()
        synchronized(this) {
            when (name) {
                ReactMarkerConstants.DOWNLOAD_START -> accumulator.record(BundleMarker.DOWNLOAD_START, instanceKey, now)
                ReactMarkerConstants.DOWNLOAD_END -> accumulator.record(BundleMarker.DOWNLOAD_END, instanceKey, now)
                ReactMarkerConstants.RUN_JS_BUNDLE_START -> accumulator.record(BundleMarker.EVALUATION_START, instanceKey, now)
                ReactMarkerConstants.RUN_JS_BUNDLE_END -> accumulator.record(BundleMarker.EVALUATION_END, instanceKey, now)
                else -> Unit
            }
        }
    }

    @Synchronized fun install() {
        if (!installed) {
            installed = true
            ReactMarker.addListener(markerListener)
        }
    }

    @Synchronized fun beginGeneration(): Int {
        generation += 1
        accumulator = JSBundleTimingAccumulator()
        result = null
        subscribers.clear()
        return generation
    }

    @Synchronized fun subscribe(callback: OnJSBundleLoaded?) {
        if (callback == null) return
        val cached = result
        if (cached != null) main.post { callback(cached) } else subscribers.add(callback)
    }

    fun contextInitialized(context: ReactContext, expectedGeneration: Int) {
        context.runOnJSQueueThread { main.post { complete(expectedGeneration) } }
    }

    @Synchronized private fun complete(expectedGeneration: Int) {
        if (expectedGeneration != generation || result != null) return
        val timings = accumulator.snapshot()
        result = timings
        val callbacks = subscribers.toList()
        subscribers.clear()
        callbacks.forEach { it(timings) }
    }

    @Synchronized fun reset() {
        generation += 1
        accumulator = JSBundleTimingAccumulator()
        result = null
        subscribers.clear()
    }
}

internal enum class BundleMarker { DOWNLOAD_START, DOWNLOAD_END, EVALUATION_START, EVALUATION_END }

internal class JSBundleTimingAccumulator {
    private data class Endpoint(
        var start: Long? = null,
        var stop: Long? = null,
        var ambiguous: Boolean = false
    )

    private val download = Endpoint()
    private val evaluation = Endpoint()

    fun record(marker: BundleMarker, instanceKey: Int, timestampMs: Long) {
        val endpoint = when (marker) {
            BundleMarker.DOWNLOAD_START, BundleMarker.DOWNLOAD_END -> download
            BundleMarker.EVALUATION_START, BundleMarker.EVALUATION_END -> {
                if (instanceKey != 1) return
                evaluation
            }
        }
        when (marker) {
            BundleMarker.DOWNLOAD_START, BundleMarker.EVALUATION_START -> {
                if (endpoint.start != null || endpoint.stop != null) endpoint.ambiguous = true
                else endpoint.start = timestampMs
            }
            BundleMarker.DOWNLOAD_END, BundleMarker.EVALUATION_END -> {
                if (endpoint.start == null || endpoint.stop != null) endpoint.ambiguous = true
                else endpoint.stop = timestampMs
            }
        }
    }

    fun snapshot(): JSBundleTimings {
        fun valid(endpoint: Endpoint): Pair<Long, Long>? {
            val start = endpoint.start ?: return null
            val stop = endpoint.stop ?: return null
            return if (!endpoint.ambiguous && stop >= start) start to stop else null
        }
        val downloadPair = valid(download)
        val evaluationPair = valid(evaluation)
        val timeline = listOfNotNull(
            downloadPair?.let { (start, stop) -> mapOf("tag" to "DOWNLOAD", "startMs" to start, "stopMs" to stop) },
            evaluationPair?.let { (start, stop) -> mapOf("tag" to "RUN_JS_BUNDLE", "startMs" to start, "stopMs" to stop) }
        ).sortedBy { it["startMs"] as Long }
        return JSBundleTimings(
            downloadPair?.let { (it.second - it.first).toDouble() },
            evaluationPair?.let { (it.second - it.first).toDouble() },
            timeline
        )
    }
}

internal fun ReactHost.installBrownfieldPerformanceStop() {
    val stop = {
        AndroidJSBundleTimingObserver.reset()
        BrownfieldPresentationRegistry.cancelAll()
    }
    addBeforeDestroyListener(stop)
}
