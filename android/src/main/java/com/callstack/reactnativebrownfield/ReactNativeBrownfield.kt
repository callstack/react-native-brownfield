package com.callstack.reactnativebrownfield

import android.app.Application
import android.os.Bundle
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.callstack.reactnativebrownfield.utils.VersionUtils
import com.facebook.react.ReactHost
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactContext
import com.facebook.react.common.build.ReactBuildConfig
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import java.util.concurrent.atomic.AtomicBoolean

fun interface OnJSBundleLoaded {
    operator fun invoke(initialized: Boolean)
}

/**
 * The threshold RN version based on which we decide whether to
 * load JNI libs or not. We only load JNI libs on version less
 * than this.
 */
private const val RN_THRESHOLD_VERSION = "0.80.0"

class ReactNativeBrownfield private constructor(val reactHost: ReactHost) {
    companion object {
        private lateinit var instance: ReactNativeBrownfield
        private val initialized = AtomicBoolean()

        @JvmStatic
        val shared: ReactNativeBrownfield get() = instance

        private fun loadNativeLibs(application: Application) {
            val rnVersion = BuildConfig.RN_VERSION

            if (VersionUtils.isVersionLessThan(rnVersion, RN_THRESHOLD_VERSION)) {
                SoLoader.init(application.applicationContext, OpenSourceMergedSoMapping)
                load()
            }
        }

        @JvmStatic
        @JvmOverloads
        fun initialize(
            application: Application,
            reactHost: ReactHost,
            onJSBundleLoaded: OnJSBundleLoaded? = null
        ) {
            if (!initialized.getAndSet(true)) {
                loadNativeLibs(application)
                instance = ReactNativeBrownfield(reactHost)

                preloadReactNative {
                    onJSBundleLoaded?.invoke(true)
                }
            }
        }

        @JvmStatic
        @JvmOverloads
        fun initialize(
            application: Application,
            options: HashMap<String, Any>,
            onJSBundleLoaded: OnJSBundleLoaded? = null
        ) {
            val reactHost: ReactHost by lazy {
                getDefaultReactHost(
                    context = application,
                    packageList = (options["packages"] as? List<*> ?: emptyList<ReactPackage>())
                        .filterIsInstance<ReactPackage>(),
                    jsMainModulePath = options["mainModuleName"] as? String ?: "index",
                    useDevSupport = options["useDevSupport"] as? Boolean ?: ReactBuildConfig.DEBUG
                )
            }

            initialize(application, reactHost, onJSBundleLoaded)
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

        private fun preloadReactNative(callback: ((Boolean) -> Unit)) {
            shared.reactHost.addReactInstanceEventListener(object :
                ReactInstanceEventListener {
                override fun onReactContextInitialized(context: ReactContext) {
                    callback(true)
                    shared.reactHost.removeReactInstanceEventListener(this)
                }
            })
            shared.reactHost.start()
        }
    }

    fun createView(
        activity: FragmentActivity?,
        moduleName: String,
        reactDelegate: ReactDelegateWrapper? = null,
        launchOptions: Bundle? = null,
    ): FrameLayout {
        val reactHost = shared.reactHost
        val resolvedDelegate =
            reactDelegate ?: ReactDelegateWrapper(activity, reactHost, moduleName, launchOptions)

        val mBackPressedCallback: OnBackPressedCallback = object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // invoked for JS stack back navigation
                resolvedDelegate.onBackPressed()
            }
        }

        // Register back press callback
        activity?.onBackPressedDispatcher?.addCallback(mBackPressedCallback)
        // invoked on the last RN screen exit
        resolvedDelegate.setHardwareBackHandler {
            mBackPressedCallback.isEnabled = false
            activity?.onBackPressedDispatcher?.onBackPressed()
        }

        /**
         * When createView method is called in ReactNativeFragment, a reactDelegate
         * instance is required. In such a case, we use the lifeCycle events of the fragment.
         * When createView method is called elsewhere, then reactDelegate is not required.
         * In such a case, we set the lifeCycle observer.
         */
        if (reactDelegate == null) {
            activity?.lifecycle?.addObserver(getLifeCycleObserver(resolvedDelegate))
        }

        resolvedDelegate.loadApp()
        return resolvedDelegate.reactRootView!!
    }

    private fun getLifeCycleObserver(reactDelegate: ReactDelegateWrapper): DefaultLifecycleObserver {
        return object : DefaultLifecycleObserver {
            override fun onResume(owner: LifecycleOwner) {
                reactDelegate.onReactHostResume()
            }

            override fun onPause(owner: LifecycleOwner) {
                reactDelegate.onHostPause()
            }

            override fun onDestroy(owner: LifecycleOwner) {
                reactDelegate.onHostDestroy()
                owner.lifecycle.removeObserver(this) // Cleanup to avoid leaks
            }
        }
    }
}
