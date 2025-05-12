package com.callstack.reactnativebrownfield

import android.app.Activity;
import android.content.Intent

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class ReactNativeBrownfieldModule(reactContext: ReactApplicationContext) :
  NativeReactNativeBrownfieldModuleSpec(reactContext) {
  companion object {
    var shouldPopToNative: Boolean = false
  }

  @ReactMethod
  override fun popToNative(animated: Boolean, result: ReadableMap?) {
    if (result != null) {
      val bundle = Arguments.toBundle(result)
      if (bundle != null) {
        val intent = Intent()
        intent.putExtras(bundle)
        reactApplicationContext.currentActivity?.setResult(Activity.RESULT_OK, intent)
      }
    }
    shouldPopToNative = true
    onBackPressed()
  }

  @ReactMethod
  override fun setPopGestureRecognizerEnabled(enabled: Boolean) {
    shouldPopToNative = enabled
  }

  @ReactMethod
  override fun setHardwareBackButtonEnabled(enabled: Boolean) {
    shouldPopToNative = enabled
  }

  private fun onBackPressed() {
    reactApplicationContext.currentActivity?.runOnUiThread {
      reactApplicationContext.currentActivity?.onBackPressed()
    }
  }

  override fun getName(): String {
    return "ReactNativeBrownfield"
  }
}
