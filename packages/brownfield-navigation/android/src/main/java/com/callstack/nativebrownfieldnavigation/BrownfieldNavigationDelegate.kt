package com.callstack.nativebrownfieldnavigation

import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.Promise

interface BrownfieldNavigationDelegate {
  fun navigateToSettings(user: UserType)
  fun navigateToReferrals(userId: String)
  fun requestNativeConfirmation(title: String, promise: Promise)
  fun showNativeBanner(message: String, onDismiss: Callback)
}
