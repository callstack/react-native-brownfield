package com.callstack.brownie

import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import java.util.concurrent.atomic.AtomicBoolean

class BrownieModule(reactContext: ReactApplicationContext) :
  NativeBrownieModuleSpec(reactContext) {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val didInstallJSI = AtomicBoolean(false)

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
    BrownieStoreBridge.setStoreDidChangeListener(storeDidChangeListener)
  }

  override fun initialize() {
    super.initialize()
    installJSIBindingsIfNeeded()
  }

  override fun invalidate() {
    BrownieStoreBridge.setStoreDidChangeListener(null)
    StoreManager.shared.clear()
    super.invalidate()
  }

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

  override fun getName(): String {
    return "Brownie"
  }
}
