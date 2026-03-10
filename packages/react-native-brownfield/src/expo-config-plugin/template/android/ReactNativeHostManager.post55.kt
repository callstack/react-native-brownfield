package {{PACKAGE_NAME}}

import android.app.Application
import android.content.res.Configuration
import com.callstack.reactnativebrownfield.OnJSBundleLoaded
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.PackageList
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

object ReactNativeHostManager {
    fun initialize(application: Application, onJSBundleLoaded: OnJSBundleLoaded? = null) {
        loadReactNative(application)

        ApplicationLifecycleDispatcher.onApplicationCreate(application)

        val reactHost: ReactHost by lazy {
            ExpoReactHostFactory.getDefaultReactHost(
                context = application.applicationContext,
                packageList = PackageList(application).packages,
            )
        }

        ReactNativeBrownfield.initialize(application, reactHost, onJSBundleLoaded)
    }

    fun onConfigurationChanged(application: Application, newConfig: Configuration) {
        ApplicationLifecycleDispatcher.onConfigurationChanged(application, newConfig)
    }
}
