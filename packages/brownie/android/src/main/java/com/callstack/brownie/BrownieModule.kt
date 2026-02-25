package com.callstack.brownie

import com.facebook.react.bridge.ReactApplicationContext

class BrownieModule(reactContext: ReactApplicationContext) :
  NativeBrownieModuleSpec(reactContext) {
  override fun getName(): String {
    return "Brownie"
  }
}
