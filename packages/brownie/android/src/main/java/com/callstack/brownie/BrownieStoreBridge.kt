package com.callstack.brownie

import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Kotlin/JNI bridge for interacting with the shared C++ Brownie store runtime.
 */
object BrownieStoreBridge {
  private val storeDidChangeListeners = ConcurrentHashMap<String, (String) -> Unit>()

  init {
    System.loadLibrary("brownie")
  }

  /**
   * Registers a listener for store change notifications emitted from native.
   *
   * @return a listener id used to remove this listener.
   */
  fun addStoreDidChangeListener(listener: (String) -> Unit): String {
    val listenerId = UUID.randomUUID().toString()
    storeDidChangeListeners[listenerId] = listener
    return listenerId
  }

  /**
   * Removes a previously registered store change listener.
   */
  fun removeStoreDidChangeListener(listenerId: String) {
    storeDidChangeListeners.remove(listenerId)
  }

  /**
   * Creates and registers a C++ store for [storeKey].
   */
  fun registerStore(storeKey: String) {
    nativeRegisterStore(storeKey)
  }

  /**
   * Removes a C++ store for [storeKey].
   */
  fun removeStore(storeKey: String) {
    nativeRemoveStore(storeKey)
  }

  /**
   * Sets a single property on a store using JSON payload.
   */
  fun setValue(valueJson: String, propKey: String, storeKey: String) {
    nativeSetValue(valueJson, propKey, storeKey)
  }

  /**
   * Gets a single property from a store as JSON.
   */
  fun getValue(propKey: String, storeKey: String): String? {
    return nativeGetValue(propKey, storeKey)
  }

  /**
   * Gets the full store snapshot as JSON.
   */
  fun getSnapshot(storeKey: String): String? {
    return nativeGetSnapshot(storeKey)
  }

  /**
   * Replaces full store state with the provided JSON payload.
   */
  fun setState(stateJson: String, storeKey: String) {
    nativeSetState(stateJson, storeKey)
  }

  /**
   * Installs Brownie JSI bindings into the provided JS runtime.
   */
  fun installJSIBindings(runtimePointer: Long) {
    nativeInstallJSIBindings(runtimePointer)
  }

  /**
   * Entry point called from JNI when a store changes in the C++ layer.
   */
  @JvmStatic
  private fun onStoreDidChange(storeKey: String) {
    storeDidChangeListeners.values.forEach { listener ->
      listener.invoke(storeKey)
    }
  }

  /**
   * Native bindings implemented in `JNIBrownieStoreBridge.cpp`.
   */
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
