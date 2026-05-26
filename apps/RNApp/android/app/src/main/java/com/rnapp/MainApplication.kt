package com.rnapp

import android.app.Application
import com.callstack.brownie.registerStoreIfNeeded
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.rnapp.brownfieldlib.BrownfieldStore
import com.rnapp.brownfieldlib.User

class MainApplication : Application(), ReactApplication {
    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList =
                PackageList(this).packages.apply {
                    // Packages that cannot be autolinked yet can be added manually here, for example:
                    // add(MyReactNativePackage())
                },
        )
    }

    override fun onCreate() {
        super.onCreate()

        registerStoreIfNeeded(storeName = BrownfieldStore.STORE_NAME) {
            BrownfieldStore(
                counter = 0.0,
                user = User(name = "Username"),
            )
        }

        loadReactNative(this)
    }
}
