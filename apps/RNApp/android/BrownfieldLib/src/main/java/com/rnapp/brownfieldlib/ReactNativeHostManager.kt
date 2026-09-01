package com.rnapp.brownfieldlib

import android.app.Application
import com.callstack.reactnativebrownfield.OnJSBundleLoaded
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.PackageList

object ReactNativeHostManager {
    fun initialize(application: Application, onJSBundleLoaded: OnJSBundleLoaded? = null) {
        val packageList = PackageList(application).packages
        ReactNativeBrownfield.initialize(application, packageList, onJSBundleLoaded)
    }
}
