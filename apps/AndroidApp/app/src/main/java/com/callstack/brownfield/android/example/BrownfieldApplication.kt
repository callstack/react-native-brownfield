package com.callstack.brownfield.android.example

import android.app.Application
import android.content.res.Configuration
import com.callstack.brownie.BrownieStoreSerializer
import com.callstack.brownie.Store
import com.callstack.brownie.StoreManager
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.google.gson.Gson

/**
 * Detox expects a [ReactApplication] so it can await the embedded RN context during E2E runs.
 * RN is initialized at process start (embedded AAR bundle — no Metro).
 *
 * We should not have React internals import in a native Android app and should only rely on
 * ReactNativeHostManager or ReactNativeBrownfield, however, since this app is a testing app and we
 * are using Detox as E2E testing driver, we are making that trade-off.
 *
 * Store registration uses [StoreManager]/[Store] member APIs (not package-level brownie helpers).
 * Those helpers are fragile when brownie is consumed only via the fat-merged brownfieldlib AAR.
 */
class BrownfieldApplication : Application(), ReactApplication {
    override val reactHost: ReactHost
        get() = ReactNativeBrownfield.shared.reactHost

    override fun onCreate() {
        super.onCreate()

        ReactNativeHostManager.initialize(this)

        StoreManager.shared.registerIfAbsent(BrownfieldStore.STORE_NAME) {
            Store(
                BrownfieldStore(
                    counter = 0.0,
                    user = User(name = "Username"),
                ),
                BrownfieldStore.STORE_NAME,
                GsonBrownfieldStoreSerializer,
            )
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ReactNativeHostManager.onConfigurationChanged(this, newConfig)
    }
}

private object GsonBrownfieldStoreSerializer : BrownieStoreSerializer<BrownfieldStore> {
    private val gson = Gson()

    override fun encode(state: BrownfieldStore): String = gson.toJson(state)

    override fun decode(snapshotJson: String): BrownfieldStore =
        gson.fromJson(snapshotJson, BrownfieldStore::class.java)
}
