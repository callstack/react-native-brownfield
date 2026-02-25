package com.callstack.reactnativebrownfield

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.buildReadableMap

class ReactNativeBrownfieldModule(val reactContext: ReactApplicationContext) :
    NativeReactNativeBrownfieldModuleSpec(reactContext) {
    companion object {
        var shouldPopToNative: Boolean = false
        private const val LOG_TAG = "ReactNativeBrownfieldModule"

        private var sharedInstance: ReactNativeBrownfieldModule? = null

        fun emitMessageFromNative(text: String) {
            if (sharedInstance == null) {
                Log.w(
                    LOG_TAG,
                    "No instance of ReactNativeBrownfieldModule found. Message will not be emitted."
                )
            }
            sharedInstance?.emitOnBrownfieldMessage(buildReadableMap {
                put("text", text)
            })
        }
    }

    init {
        sharedInstance = this
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

    override fun postMessage(message: String) {
        ReactNativeBrownfield.shared.dispatchMessage(message)
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
