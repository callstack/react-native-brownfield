package com.callstack.nativebrownfieldnavigation

import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod

class NativeBrownfieldNavigationModule(
  reactContext: ReactApplicationContext
) : NativeBrownfieldNavigationSpec(reactContext) {
  @ReactMethod
  override fun temporary() {
    Log.d(NAME, "temporary")
  }

  companion object {
    const val NAME = "NativeBrownfieldNavigation"
  }
}
