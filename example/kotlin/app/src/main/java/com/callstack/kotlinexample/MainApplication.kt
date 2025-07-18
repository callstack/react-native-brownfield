package com.callstack.kotlinexample

import android.app.Application
import android.util.Log
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.PackageList

class MainApplication : Application() {
  override fun onCreate() {
    super.onCreate()

    val packages = PackageList(this).packages
    ReactNativeBrownfield.initialize(this, packages) {
      Log.d("test", "test")
    }
  }
}
