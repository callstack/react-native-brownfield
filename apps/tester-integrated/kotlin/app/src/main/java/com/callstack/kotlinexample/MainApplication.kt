package com.callstack.kotlinexample

import android.app.Application
import android.util.Log
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.PackageList
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative

class MainApplication : Application() {
  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)

    val packages = PackageList(this).packages
    ReactNativeBrownfield.initialize(this, packages) {
      Log.d("test", "test")
    }
  }
}
