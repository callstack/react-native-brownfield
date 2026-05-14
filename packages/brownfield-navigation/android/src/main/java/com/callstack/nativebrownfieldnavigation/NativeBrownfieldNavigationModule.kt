package com.callstack.nativebrownfieldnavigation

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod

class NativeBrownfieldNavigationModule(
  reactContext: ReactApplicationContext
) : NativeBrownfieldNavigationSpec(reactContext) {
  @ReactMethod
  override fun navigateToSettings() {
    BrownfieldNavigationManager.getDelegate().navigateToSettings()
  }

  @ReactMethod
  override fun navigateToReferrals(userId: String) {
    BrownfieldNavigationManager.getDelegate().navigateToReferrals(userId)
  }

  companion object {
    const val NAME = "NativeBrownfieldNavigation"
  }
}
