package com.callstack.nativebrownfieldnavigation

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.Promise
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

  @ReactMethod
  override fun requestNativeConfirmation(title: String, promise: Promise) {
    BrownfieldNavigationManager.getDelegate().requestNativeConfirmation(title, promise)
  }

  @ReactMethod
  override fun showNativeBanner(message: String, onDismiss: Callback) {
    BrownfieldNavigationManager.getDelegate().showNativeBanner(message, onDismiss)
  }

  companion object {
    const val NAME = "NativeBrownfieldNavigation"
  }
}
