package com.callstack.reactnativebrownfield

import android.app.Application
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactContext
import com.facebook.soloader.SoLoader
import java.util.concurrent.atomic.AtomicBoolean

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
        SoLoader.init(application.applicationContext,false)
      }
    }

    @JvmStatic
    fun initialize(application: Application, options: HashMap<String, Any>) {
      val rnHost = object : ReactNativeHost(application) {
        override fun getUseDeveloperSupport(): Boolean {
          return options["useDeveloperSupport"] as? Boolean ?: BuildConfig.DEBUG
        }

        override fun getPackages(): List<ReactPackage> {
          return (options["packages"] as? List<*> ?: emptyList<ReactPackage>())
            .filterIsInstance<ReactPackage>()
        }

        override fun getJSMainModuleName(): String {
          return options["mainModuleName"] as? String ?: super.getJSMainModuleName()
        }
      }

      initialize(application, rnHost)
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

