package com.callstack.reactnativebrownfield

import android.app.Application
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactContext
import com.facebook.soloader.SoLoader
import java.util.concurrent.atomic.AtomicBoolean

class BridgeManager private constructor(val rnHost: ReactNativeHost, val application: Application) {
  companion object {
    private lateinit var instance: BridgeManager
    private val initialized = AtomicBoolean()

    val shared: BridgeManager get() = instance

    fun initialize(rnHost: ReactNativeHost, application: Application) {
      if(!initialized.getAndSet(true)) {
        instance = BridgeManager(rnHost, application)
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

  var reactInstanceManager: ReactInstanceManager? = null

  fun startReactNative(listener: ((initialized: Boolean) -> Unit)?) {

    reactInstanceManager = rnHost.reactInstanceManager

    if (listener != null) {
      reactInstanceManager?.addReactInstanceEventListener { listener(true) }
    }

    reactInstanceManager?.createReactContextInBackground()
  }
}