package com.callstack.brownfield.android.example

import android.content.res.Configuration

typealias ReactNativeHostManager = com.rnapp.brownfieldlib.ReactNativeHostManager

fun ReactNativeHostManager.onConfigurationChanged(application: android.app.Application, newConfig: Configuration) {
    // no-op that is prepared to match of the Expo ReactNativeHostManager
}
