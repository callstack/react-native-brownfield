package com.callstack.nativebrownfieldnavigation

object BrownfieldNavigationManager {
  private var navigationDelegate: BrownfieldNavigationDelegate? = null

  fun setDelegate(navigationDelegate: BrownfieldNavigationDelegate) {
    this.navigationDelegate = navigationDelegate
  }

  fun getDelegate(): BrownfieldNavigationDelegate {
    return navigationDelegate
      ?: throw IllegalStateException("BrownfieldNavigation delegate is not set.")
  }
}
