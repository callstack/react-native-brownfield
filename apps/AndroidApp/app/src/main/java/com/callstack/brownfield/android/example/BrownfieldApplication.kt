package com.callstack.brownfield.android.example

import android.app.Application
import android.content.res.Configuration
import com.callstack.brownie.registerStoreIfNeeded
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost

/**
 * Detox expects a [ReactApplication] so it can await the embedded RN context during E2E runs.
 * RN is initialized at process start (embedded AAR bundle — no Metro).
 * 
 * We should not have React internals import in a native Android app and should only rely on *ReactNativeHostManager or ReactNativeBrownfield, however, since this app is a testing app and we are *using Detox as E2E testing driver, we are making that trade-off.
 */
class BrownfieldApplication : Application(), ReactApplication {
    @Suppress("DEPRECATION")
    override val reactNativeHost: ReactNativeHost
        get() = ReactNativeHostManager.reactNativeHost

    override val reactHost: ReactHost
        get() = ReactNativeBrownfield.shared.reactHost

    override fun onCreate() {
        super.onCreate()

        ReactNativeHostManager.initialize(this)

        registerStoreIfNeeded(
            storeName = BrownfieldStore.STORE_NAME
        ) {
            BrownfieldStore(
                counter = 0.0,
                user = User(name = "Username")
            )
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ReactNativeHostManager.onConfigurationChanged(this, newConfig)
    }
}
