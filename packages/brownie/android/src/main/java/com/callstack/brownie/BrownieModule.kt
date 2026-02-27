package com.callstack.brownie

import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import java.util.concurrent.atomic.AtomicBoolean

/**
 * TurboModule entrypoint for Brownie on Android.
 *
 * It installs JSI bindings and forwards native store change events to JavaScript.
 */
class BrownieModule(reactContext: ReactApplicationContext) :
  NativeBrownieModuleSpec(reactContext) {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val didInstallJSI = AtomicBoolean(false)
  private var storeDidChangeListenerId: String? = null

  private val storeDidChangeListener: (String) -> Unit = { storeKey ->
    val eventPayload =
      Arguments.createMap().apply {
        putString("storeKey", storeKey)
        putString("key", "storeKey")
        putString("value", storeKey)
      }

    if (Looper.myLooper() == Looper.getMainLooper()) {
      emitNativeStoreDidChange(eventPayload)
    } else {
      mainHandler.post { emitNativeStoreDidChange(eventPayload) }
    }
  }

  init {
    storeDidChangeListenerId = BrownieStoreBridge.addStoreDidChangeListener(storeDidChangeListener)
  }

  /**
   * Called by React Native when the module is initialized.
   */
  override fun initialize() {
    super.initialize()
    installJSIBindingsIfNeeded()
  }

  /**
   * Called when the module is being torn down.
   */
  override fun invalidate() {
    storeDidChangeListenerId?.let(BrownieStoreBridge::removeStoreDidChangeListener)
    storeDidChangeListenerId = null
    StoreManager.shared.clear()
    super.invalidate()
  }

  /**
   * Installs C++ JSI globals once a valid JS runtime pointer is available.
   */
  private fun installJSIBindingsIfNeeded() {
    if (didInstallJSI.get()) {
      return
    }

    val runtimePointer = reactApplicationContext.javaScriptContextHolder?.get() ?: 0L
    if (runtimePointer == 0L) {
      return
    }

    BrownieStoreBridge.installJSIBindings(runtimePointer)
    didInstallJSI.set(true)
  }

  companion object {
    const val NAME = "Brownie"
  }

  /**
   * Exposes this module name to React Native.
   */
  override fun getName(): String {
    return NAME
  }
}
