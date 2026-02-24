package com.callstack.reactnativebrownfield

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ReactNativeBrownfieldModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  companion object {
    var shouldPopToNative: Boolean = false
  }

  @ReactMethod
  fun popToNative(animated: Boolean) {
    shouldPopToNative = true
    onBackPressed()
  }

  @ReactMethod
  fun setPopGestureRecognizerEnabled(enabled: Boolean) {
    shouldPopToNative = enabled
  }

  @ReactMethod
  fun setHardwareBackButtonEnabled(isFirstRoute: Boolean) {
    shouldPopToNative = isFirstRoute
  }

  @ReactMethod
  fun postMessage(message: String) {
    ReactNativeBrownfield.shared.dispatchMessage(message)
  }

  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Double) {}

  private fun onBackPressed() {
    reactApplicationContext.currentActivity?.runOnUiThread {
      reactApplicationContext.currentActivity?.onBackPressed()
    }
  }

  override fun getName(): String {
    return "ReactNativeBrownfield"
  }
}
