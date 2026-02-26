package com.callstack.brownie

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

object BrownieStoreBridge {
  private val storeDidChangeListeners = ConcurrentHashMap<String, (String) -> Unit>()

  init {
    System.loadLibrary("brownie")
  }

  fun addStoreDidChangeListener(listener: (String) -> Unit): String {
    val listenerId = UUID.randomUUID().toString()
    storeDidChangeListeners[listenerId] = listener
    return listenerId
  }

  fun removeStoreDidChangeListener(listenerId: String) {
    storeDidChangeListeners.remove(listenerId)
  }

  fun registerStore(storeKey: String) {
    nativeRegisterStore(storeKey)
  }

  fun removeStore(storeKey: String) {
    nativeRemoveStore(storeKey)
  }

  fun setValue(valueJson: String, propKey: String, storeKey: String) {
    nativeSetValue(valueJson, propKey, storeKey)
  }

  fun getValue(propKey: String, storeKey: String): String? {
    return nativeGetValue(propKey, storeKey)
  }

  fun getSnapshot(storeKey: String): String? {
    return nativeGetSnapshot(storeKey)
  }

  fun setState(stateJson: String, storeKey: String) {
    nativeSetState(stateJson, storeKey)
  }

  fun installJSIBindings(runtimePointer: Long) {
    nativeInstallJSIBindings(runtimePointer)
  }

  @JvmStatic
  private fun onStoreDidChange(storeKey: String) {
    storeDidChangeListeners.values.forEach { listener ->
      listener.invoke(storeKey)
    }
  }

  @JvmStatic
  private external fun nativeInstallJSIBindings(runtimePointer: Long)

  @JvmStatic
  private external fun nativeRegisterStore(storeKey: String)

  @JvmStatic
  private external fun nativeRemoveStore(storeKey: String)

  @JvmStatic
  private external fun nativeSetValue(valueJson: String, propKey: String, storeKey: String)

  @JvmStatic
  private external fun nativeGetValue(propKey: String, storeKey: String): String?

  @JvmStatic
  private external fun nativeGetSnapshot(storeKey: String): String?

  @JvmStatic
  private external fun nativeSetState(stateJson: String, storeKey: String)
}
