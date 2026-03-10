package com.callstack.reactnativebrownfield

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ReactNativeBrownfieldModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  companion object {
    var shouldPopToNative: Boolean = false
    private const val LOG_TAG = "ReactNativeBrownfieldModule"

    fun emitMessageFromNative(text: String) {
      Log.w(
          LOG_TAG,
          "ReactNativeBrownfieldModule::emitMessageFromNative only supports the New Architecture. This call is ineffective and will not cause any messages to be emitted."
      )
    }
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
