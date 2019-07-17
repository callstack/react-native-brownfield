package com.callstack.reactnativebrownfield

import android.app.Application
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.soloader.SoLoader
import java.util.concurrent.atomic.AtomicBoolean

class BridgeManager private constructor(val reactNativeHost: ReactNativeHost) {
  companion object {
    private lateinit var instance: BridgeManager
    private val initialized = AtomicBoolean()

    val shared: BridgeManager get() = instance

    fun initialize(rnHost: ReactNativeHost, application: Application) {
      if(!initialized.getAndSet(true)) {
        instance = BridgeManager(rnHost)
        SoLoader.init(application.applicationContext,false)
      }
    }

    fun initialize(options: HashMap<String, Any>, application: Application) {
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

      initialize(rnHost, application)
    }

    fun initialize(packages: List<ReactPackage>, application: Application) {
      val options = hashMapOf("packages" to packages, "mainModuleName" to "index")

      initialize(options, application)
    }
  }


  fun startReactNative(listener: ((initialized: Boolean) -> Unit)?) {
    if (listener != null) {
      reactNativeHost.reactInstanceManager?.addReactInstanceEventListener { listener(true) }
    }

    reactNativeHost.reactInstanceManager?.createReactContextInBackground()
  }
}