package com.callstack.reactnativebrownfield

import android.app.Application
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactContext
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import java.util.concurrent.atomic.AtomicBoolean
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load

interface InitializedCallback {
  operator fun invoke(initialized: Boolean)
}

class ReactNativeBrownfield private constructor(val reactNativeHost: ReactNativeHost) {
  companion object {
    private lateinit var instance: ReactNativeBrownfield
    private val initialized = AtomicBoolean()

    @JvmStatic
    val shared: ReactNativeBrownfield get() = instance

    @JvmStatic
    fun initialize(application: Application, rnHost: ReactNativeHost) {
      if(!initialized.getAndSet(true)) {
        instance = ReactNativeBrownfield(rnHost)
        SoLoader.init(application.applicationContext, OpenSourceMergedSoMapping)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
          // If you opted-in for the New Architecture, we load the native entry point for this app.
          load()
        }
      }
    }

    @JvmStatic
    fun initialize(application: Application, options: HashMap<String, Any>) {
      val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(application) {

          override fun getJSMainModuleName(): String = "index"
          override fun getPackages(): List<ReactPackage> {
            return (options["packages"] as? List<*> ?: emptyList<ReactPackage>())
              .filterIsInstance<ReactPackage>()
          }

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

      initialize(application, reactNativeHost)
    }

    @JvmStatic
    fun initialize(application: Application, packages: List<ReactPackage>) {
      val options = hashMapOf("packages" to packages, "mainModuleName" to "index")

      initialize(application, options)
    }
  }

  fun startReactNative(callback: InitializedCallback?) {
    startReactNative { callback?.invoke(it) }
  }

  @JvmName("startReactNativeKotlin")
  fun startReactNative(callback: ((initialized: Boolean) -> Unit)?) {
    reactNativeHost.reactInstanceManager.addReactInstanceEventListener(object : ReactInstanceEventListener {
      override fun onReactContextInitialized(reactContext: ReactContext) {
        callback?.let { it(true) }
        reactNativeHost.reactInstanceManager.removeReactInstanceEventListener(this)
      }
    })
    reactNativeHost.reactInstanceManager?.createReactContextInBackground()
  }
}

