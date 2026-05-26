package com.callstack.nativebrownfieldnavigation

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class NativeBrownfieldNavigationModule(
  reactContext: ReactApplicationContext
) : NativeBrownfieldNavigationSpec(reactContext) {
  @ReactMethod
  override fun navigateToSettings(user: ReadableMap) {
    val userModel = user.let(::toUserType)
    BrownfieldNavigationManager.getDelegate().navigateToSettings(userModel)
  }

  @ReactMethod
  override fun navigateToReferrals(userId: String) {
    BrownfieldNavigationManager.getDelegate().navigateToReferrals(userId)
  }

  companion object {
    const val NAME = "NativeBrownfieldNavigation"
  }
}
