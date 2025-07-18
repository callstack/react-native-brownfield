package com.callstack.reactnativebrownfield

import android.app.Application
import android.content.Context
import android.os.Bundle
import android.widget.FrameLayout
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.callstack.reactnativebrownfield.utils.VersionUtils
import com.facebook.react.ReactDelegate
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactRootView
import com.facebook.react.bridge.ReactContext
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import java.util.concurrent.atomic.AtomicBoolean
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

fun interface InitializedCallback {
  operator fun invoke(initialized: Boolean)
}

/**
 * The threshold RN version based on which we decide whether to
 * load JNI libs or not. We only load JNI libs on version less
 * than this.
 */
private const val RN_THRESHOLD_VERSION = "0.80.0"

class ReactNativeBrownfield private constructor(val reactNativeHost: ReactNativeHost) {
  companion object {
    private lateinit var instance: ReactNativeBrownfield
    private val initialized = AtomicBoolean()

    @JvmStatic
    val shared: ReactNativeBrownfield get() = instance

    private fun initialize(rnHost: ReactNativeHost, callback: InitializedCallback? = null) {
      if (!initialized.getAndSet(true)) {
        instance = ReactNativeBrownfield(rnHost)

        preloadReactNative {
          callback?.invoke(true)
        }
      }
    }

    private fun initialize(application: Application, options: HashMap<String, Any>, callback: InitializedCallback? = null) {
      val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(application) {

          override fun getJSMainModuleName(): String {
            return options["mainModuleName"] as? String ?: super.getJSMainModuleName()
          }

          override fun getPackages(): List<ReactPackage> {
            return (options["packages"] as? List<*> ?: emptyList<ReactPackage>())
              .filterIsInstance<ReactPackage>()
          }

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

      initialize(reactNativeHost, callback)
    }

    @JvmStatic
    fun initialize(application: Application, packages: List<ReactPackage>, callback: InitializedCallback? = null) {
      val options = hashMapOf("packages" to packages, "mainModuleName" to "index")
      val rnVersion = BuildConfig.RN_VERSION

      if (VersionUtils.isVersionLessThan(rnVersion, RN_THRESHOLD_VERSION)) {
        SoLoader.init(application.applicationContext, OpenSourceMergedSoMapping)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
          // If you opted-in for the New Architecture, we load the native entry point for this app.
          load()
        }
      }

      initialize(application, options, callback)
    }

    private fun preloadReactNative(callback: ((Boolean) -> Unit)) {
      val reactInstanceManager = shared.reactNativeHost.reactInstanceManager
      reactInstanceManager.addReactInstanceEventListener(object :
        ReactInstanceEventListener {
        override fun onReactContextInitialized(reactContext: ReactContext) {
          callback(true)
          reactInstanceManager.removeReactInstanceEventListener(this)
        }
      })
      reactInstanceManager?.createReactContextInBackground()
    }
  }

  fun createView(
    context: Context,
    activity: FragmentActivity?,
    moduleName: String,
    launchOptions: Bundle? = null,
  ): FrameLayout {
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      val reactHost = getDefaultReactHost(
        context,
        shared.reactNativeHost
      )
      val reactDelegate = ReactDelegate(activity, reactHost, moduleName, launchOptions)

      activity?.lifecycle?.addObserver(object : DefaultLifecycleObserver {
        override fun onResume(owner: LifecycleOwner) {
          reactDelegate.onHostResume()
        }

        override fun onPause(owner: LifecycleOwner) {
          reactDelegate.onHostPause()
        }

        override fun onDestroy(owner: LifecycleOwner) {
          reactDelegate.onHostDestroy()
          owner.lifecycle.removeObserver(this) // Cleanup to avoid leaks
        }
      })

      reactDelegate.loadApp()
      return reactDelegate.reactRootView!!
    }

    val instanceManager: ReactInstanceManager? = shared.reactNativeHost?.reactInstanceManager
    val reactView = ReactRootView(context)
    reactView.startReactApplication(
      instanceManager,
      moduleName,
      launchOptions,
    )

    return reactView
  }
}

