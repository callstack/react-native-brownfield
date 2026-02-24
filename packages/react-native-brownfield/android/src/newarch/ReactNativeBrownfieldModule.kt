package com.callstack.reactnativebrownfield

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod

class ReactNativeBrownfieldModule(reactContext: ReactApplicationContext) :
    NativeReactNativeBrownfieldModuleSpec(reactContext) {
    companion object {
        var shouldPopToNative: Boolean = false
    }

    @ReactMethod
    override fun popToNative(animated: Boolean) {
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

    @ReactMethod
    override fun postMessage(message: String) {
        ReactNativeBrownfield.shared.dispatchMessage(message)
    }

    @ReactMethod
    override fun addListener(eventName: String) {}

    @ReactMethod
    override fun removeListeners(count: Double) {}

    private fun onBackPressed() {
        reactApplicationContext.currentActivity?.runOnUiThread {
            reactApplicationContext.currentActivity?.onBackPressed()
        }
    }

    override fun getName(): String {
        return "ReactNativeBrownfield"
    }
}
