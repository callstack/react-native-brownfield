package com.rnapp.brownfieldlib

import android.app.Application
import com.callstack.reactnativebrownfield.OnJSBundleLoaded
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.PackageList

import com.facebook.react.PackageList
import com.facebook.react.ReactNativeHost

object ReactNativeHostManager {
    @Suppress("DEPRECATION")
    val reactNativeHost: ReactNativeHost
        get() =
            throw RuntimeException(
                "You should not use ReactNativeHost directly in the New Architecture"
            )

    fun initialize(application: Application, onJSBundleLoaded: OnJSBundleLoaded? = null) {
        val packageList = PackageList(application).packages
        ReactNativeBrownfield.initialize(application, packageList, onJSBundleLoaded)
    }
}
