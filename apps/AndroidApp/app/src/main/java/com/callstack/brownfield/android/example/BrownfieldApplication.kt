package com.callstack.brownfield.android.example

import android.app.Application
import android.content.res.Configuration
import com.callstack.brownie.registerStoreIfNeeded
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost

/**
 * Detox expects a [ReactApplication] so it can await the embedded RN context during E2E runs.
 * RN is initialized at process start (embedded AAR bundle — no Metro).
 */
class BrownfieldApplication : Application(), ReactApplication {
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
