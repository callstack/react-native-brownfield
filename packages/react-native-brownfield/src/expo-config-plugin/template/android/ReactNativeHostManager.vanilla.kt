package {{PACKAGE_NAME}}

import android.app.Application
import android.content.res.Configuration
import com.callstack.reactnativebrownfield.OnJSBundleLoaded
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.PackageList
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

object ReactNativeHostManager {
    fun initialize(application: Application, onJSBundleLoaded: OnJSBundleLoaded? = null) {
        loadReactNative(application)

        val reactHost: ReactHost by lazy {
            getDefaultReactHost(
                context = application,
                packageList = PackageList(application).packages,
                jsMainModulePath = "index",
                jsBundleAssetPath = "index.android.bundle",
                jsBundleFilePath = null,
                useDevSupport = BuildConfig.DEBUG,
                jsRuntimeFactory = null
            )
        }

        ReactNativeBrownfield.initialize(application, reactHost, onJSBundleLoaded)
    }

    fun onConfigurationChanged(application: Application, newConfig: Configuration) {
        // no-op (kept for API symmetry with Expo variant)
    }
}

