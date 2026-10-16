package {{PACKAGE_NAME}}

import android.app.Application
import android.content.res.Configuration
import com.callstack.reactnativebrownfield.OnJSBundleLoaded
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.PackageList
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.views.view.setEdgeToEdgeFeatureFlagOn

object ReactNativeHostManager {
    fun initialize(application: Application, onJSBundleLoaded: OnJSBundleLoaded? = null) {
        // initialize() loads the native libs and feature flags itself; calling
        // loadReactNative on top of it overrides the flags twice and crashes.
        // Keep the edge-to-edge flag it would have set.
        if (BuildConfig.IS_EDGE_TO_EDGE_ENABLED) {
            setEdgeToEdgeFeatureFlagOn()
        }

        // Factory so the host is built after initialize() runs SoLoader.init.
        ReactNativeBrownfield.initialize(application, onJSBundleLoaded) {
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
    }

    fun onConfigurationChanged(application: Application, newConfig: Configuration) {
        // no-op (kept for API symmetry with Expo variant)
    }
}
