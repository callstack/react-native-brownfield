package com.callstack.reactnativebrownfield

import android.app.Application
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactContext
import java.util.concurrent.atomic.AtomicBoolean

class BridgeManager private constructor(val rnHost: ReactNativeHost) {
  companion object {
    private lateinit var instance: BridgeManager
    private val initialized = AtomicBoolean()

    val shared: BridgeManager get() = instance

    fun initialize(rnHost: ReactNativeHost) {
      if(initialized.getAndSet(true)) {
        instance = BridgeManager(rnHost)
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
  }
}