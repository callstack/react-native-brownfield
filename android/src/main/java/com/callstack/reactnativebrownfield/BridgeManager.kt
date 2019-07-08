package com.callstack.reactnativebrownfield

import android.app.Application
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
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
  }

  private var reactInstanceManager: ReactInstanceManager? = null

  fun startReactNative(listener: ((initialized: Boolean) -> Unit)?) {

    reactInstanceManager = rnHost.reactInstanceManager

    if (listener != null) {
      reactInstanceManager?.addReactInstanceEventListener(object: ReactInstanceManager.ReactInstanceEventListener {
        override fun onReactContextInitialized(context: ReactContext?) {
          listener(true)
        }
      })
    }

    reactInstanceManager?.createReactContextInBackground()
  }
}