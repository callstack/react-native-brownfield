package com.callstack.reactnativebrownfield

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BrownfieldPerformanceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "BrownfieldPerformance"

    @ReactMethod
    fun markFullyDisplayed(presentationID: String) {
        BrownfieldPresentationRegistry.mark(presentationID)
    }
}
