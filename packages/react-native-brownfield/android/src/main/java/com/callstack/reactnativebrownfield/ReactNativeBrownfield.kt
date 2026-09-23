package com.callstack.reactnativebrownfield

import android.app.Application
import android.os.Bundle
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.ReactHost
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactContext
import com.facebook.react.common.build.ReactBuildConfig
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicBoolean

fun interface OnJSBundleLoaded {
    operator fun invoke(timings: JSBundleTimings)
}

fun interface OnMessageListener {
    fun onMessage(message: String)
}

class ReactNativeBrownfield private constructor(val reactHost: ReactHost) {
    private val messageListeners = CopyOnWriteArrayList<OnMessageListener>()

    companion object {
        private lateinit var instance: ReactNativeBrownfield
        private val initialized = AtomicBoolean()
        private val nativeLibsLoaded = AtomicBoolean()
        private lateinit var applicationContext: Application

        @JvmStatic
        val shared: ReactNativeBrownfield get() = instance

        private fun loadNativeLibs(application: Application) {
            if (!nativeLibsLoaded.getAndSet(true)) {
                loadNativeLibsInternal(application)
            }
        }

        private fun loadNativeLibsInternal(application: Application) {
            SoLoader.init(application.applicationContext, OpenSourceMergedSoMapping)
            load()
        }

        @Deprecated(
            message = "Unsafe when reactHost construction triggers SoLoader (e.g. ExpoReactHostFactory): " +
                "the parameter is evaluated by the caller before loadNativeLibs() runs. " +
                "Use initialize(application, onJSBundleLoaded) { reactHostFactory } instead.",
            replaceWith = ReplaceWith("initialize(application, onJSBundleLoaded) { reactHost }")
        )
        @JvmStatic
        @JvmOverloads
        fun initialize(
            application: Application,
            reactHost: ReactHost,
            onJSBundleLoaded: OnJSBundleLoaded? = null
        ) {
            applicationContext = application
            if (!initialized.getAndSet(true)) {
                AndroidJSBundleTimingObserver.install()
                loadNativeLibs(application)
                installAndPreload(reactHost, onJSBundleLoaded)
            } else {
                invokeWhenJSBundleLoaded(onJSBundleLoaded)
            }
        }

        @JvmStatic
        fun initialize(
            application: Application,
            onJSBundleLoaded: OnJSBundleLoaded? = null,
            reactHostFactory: () -> ReactHost
        ) {
            applicationContext = application
            if (!initialized.getAndSet(true)) {
                AndroidJSBundleTimingObserver.install()
                loadNativeLibs(application)
                installAndPreload(reactHostFactory(), onJSBundleLoaded)
            } else {
                invokeWhenJSBundleLoaded(onJSBundleLoaded)
            }
        }

        @JvmStatic
        @JvmOverloads
        fun initialize(
            application: Application,
            options: HashMap<String, Any>,
            onJSBundleLoaded: OnJSBundleLoaded? = null
        ) {
            applicationContext = application
            if (!initialized.getAndSet(true)) {
                AndroidJSBundleTimingObserver.install()
                loadNativeLibs(application)
                val reactHost = getDefaultReactHost(
                    context = application,
                    packageList = (options["packages"] as? List<*> ?: emptyList<ReactPackage>())
                        .filterIsInstance<ReactPackage>(),
                    jsMainModulePath = options["mainModuleName"] as? String ?: "index",
                    jsBundleAssetPath = options["bundleAssetPath"] as? String
                        ?: "index.android.bundle",
                    jsBundleFilePath = options["bundleFilePath"] as? String,
                    useDevSupport = options["useDeveloperSupport"] as? Boolean
                        ?: ReactBuildConfig.DEBUG,
                    jsRuntimeFactory = null
                )
                installAndPreload(reactHost, onJSBundleLoaded)
            } else {
                invokeWhenJSBundleLoaded(onJSBundleLoaded)
            }
        }

        @JvmStatic
        @JvmOverloads
        fun initialize(
            application: Application,
            packages: List<ReactPackage>,
            onJSBundleLoaded: OnJSBundleLoaded? = null
        ) {
            val options = hashMapOf("packages" to packages, "mainModuleName" to "index")

            initialize(application, options, onJSBundleLoaded)
        }

        private fun preloadReactNative(generation: Int) {
            shared.reactHost.addReactInstanceEventListener(object :
                ReactInstanceEventListener {
                override fun onReactContextInitialized(context: ReactContext) {
                    AndroidJSBundleTimingObserver.contextInitialized(context, generation)
                    shared.reactHost.removeReactInstanceEventListener(this)
                }
            })
            shared.reactHost.start()
        }

        private fun installAndPreload(reactHost: ReactHost, onJSBundleLoaded: OnJSBundleLoaded?) {
            AndroidJSBundleTimingObserver.install()
            val generation = AndroidJSBundleTimingObserver.beginGeneration()
            instance = ReactNativeBrownfield(reactHost)
            reactHost.installBrownfieldPerformanceStop()
            AndroidJSBundleTimingObserver.subscribe(onJSBundleLoaded)
            preloadReactNative(generation)
        }

        private fun invokeWhenJSBundleLoaded(onJSBundleLoaded: OnJSBundleLoaded?) {
            if (onJSBundleLoaded == null || !::instance.isInitialized) {
                return
            }

            AndroidJSBundleTimingObserver.subscribe(onJSBundleLoaded)
        }

        internal fun currentReactContext(): ReactContext? =
            if (::instance.isInitialized) instance.reactHost.currentReactContext else null

        internal fun displayFrameIntervalNanos(): Long {
            if (!::applicationContext.isInitialized) return 1_000_000_000L / 60
            @Suppress("DEPRECATION")
            val refreshRate = applicationContext
                .getSystemService(WindowManager::class.java)
                ?.defaultDisplay
                ?.refreshRate
                ?.takeIf { it > 0f } ?: 60f
            return (1_000_000_000.0 / refreshRate).toLong()
        }
    }

    /**
     * Send a serialized JSON message to the React Native JS application. This resembles the web `window.postMessage` API.
     * @note This method is available only on the New Architecture - on Old Architecture, it will be a no-op.
     * @param message - The serialized JSON message to send to the React Native JS application.
     * @example
     * val json = JSONObject().put("text", text).toString()
     * ReactNativeBrownfield.shared.postMessage(json)
     */
    fun postMessage(message: String) {
        ReactNativeBrownfieldModule.emitMessageFromNative(message)
    }

    /**
     * Register a listener for messages sent from the React Native JS application.
     * @note This method is available only on the New Architecture - on Old Architecture, it will be a no-op.
     * @param listener - The listener to register.
     */
    fun addMessageListener(listener: OnMessageListener) {
        messageListeners.add(listener)
    }

    /**
     * Remove a previously registered message listener.
     * @note This method is available only on the New Architecture - on Old Architecture, it will be a no-op.
     * @param listener - The listener to remove.
     */
    fun removeMessageListener(listener: OnMessageListener) {
        messageListeners.remove(listener)
    }

    internal fun dispatchMessage(message: String) {
        for (listener in messageListeners) {
            listener.onMessage(message)
        }
    }

    fun createView(
        activity: FragmentActivity?,
        moduleName: String,
        reactDelegate: ReactDelegateWrapper? = null,
        launchOptions: Bundle? = null,
    ): FrameLayout {
        return createViewInternal(activity, moduleName, reactDelegate, launchOptions, null, false)
    }

    @JvmOverloads
    fun createView(
        activity: FragmentActivity?,
        moduleName: String,
        reactDelegate: ReactDelegateWrapper? = null,
        launchOptions: Bundle? = null,
        waitForFullDisplay: Boolean,
        collectThreadMetrics: Boolean = false,
        onMetrics: OnDisplayMetrics? = null,
    ): FrameLayout {
        val session = BrownfieldDisplaySession(
            moduleName, waitForFullDisplay, collectThreadMetrics, onMetrics
        )
        val props = Bundle(launchOptions ?: Bundle()).apply {
            putString("brownfieldPresentationID", session.id)
        }
        return createViewInternal(activity, moduleName, reactDelegate, props, session, false)
    }

    internal fun createViewInternal(
        activity: FragmentActivity?,
        moduleName: String,
        reactDelegate: ReactDelegateWrapper?,
        launchOptions: Bundle?,
        session: BrownfieldDisplaySession?,
        requiresResume: Boolean,
    ): FrameLayout {
        val reactHost = shared.reactHost
        val resolvedDelegate = when {
            reactDelegate == null -> ReactDelegateWrapper(activity, reactHost, moduleName, launchOptions)
            session != null && reactDelegate.brownfieldLaunchOptions !== launchOptions ->
                reactDelegate.withLaunchOptions(launchOptions)
            else -> reactDelegate
        }

        val backPressedCallback: OnBackPressedCallback = object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // invoked for JS stack back navigation
                resolvedDelegate.onBackPressed()
            }
        }

        // Register back press callback
        activity?.onBackPressedDispatcher?.addCallback(backPressedCallback)
        // invoked on the last RN screen exit
        resolvedDelegate.setHardwareBackHandler {
            backPressedCallback.isEnabled = false
            activity?.onBackPressedDispatcher?.onBackPressed()
            backPressedCallback.isEnabled = true
        }

        /**
         * When createView method is called in ReactNativeFragment, a reactDelegate
         * instance is required. In such a case, we use the lifeCycle events of the fragment.
         * When createView method is called elsewhere, then reactDelegate is not required.
         * In such a case, we set the lifeCycle observer.
         */
        if (reactDelegate == null) {
            activity?.lifecycle?.addObserver(getLifeCycleObserver(resolvedDelegate, session))
        }

        resolvedDelegate.loadApp()
        return resolvedDelegate.reactRootView!!.also { session?.bind(it, requiresResume) }
    }

    private fun getLifeCycleObserver(
        reactDelegate: ReactDelegateWrapper,
        session: BrownfieldDisplaySession?
    ): DefaultLifecycleObserver {
        return object : DefaultLifecycleObserver {
            override fun onResume(owner: LifecycleOwner) {
                reactDelegate.onReactHostResume()
            }

            override fun onPause(owner: LifecycleOwner) {
                session?.cancel()
                reactDelegate.onHostPause()
            }

            override fun onDestroy(owner: LifecycleOwner) {
                session?.cancel()
                reactDelegate.onHostDestroy()
                owner.lifecycle.removeObserver(this) // Cleanup to avoid leaks
            }
        }
    }
}
