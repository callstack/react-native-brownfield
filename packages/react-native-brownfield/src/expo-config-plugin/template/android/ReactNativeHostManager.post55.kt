package {{PACKAGE_NAME}}

import android.app.Application
import android.content.res.Configuration
import com.callstack.reactnativebrownfield.OnJSBundleLoaded
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.PackageList
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

object ReactNativeHostManager {
    fun initialize(application: Application, onJSBundleLoaded: OnJSBundleLoaded? = null) {
        ApplicationLifecycleDispatcher.onApplicationCreate(application)

        ReactNativeBrownfield.initialize(application, onJSBundleLoaded) {
            ExpoReactHostFactory.getDefaultReactHost(
                context = application.applicationContext,
                packageList = PackageList(application).packages,
            )
        }
    }

    fun onConfigurationChanged(application: Application, newConfig: Configuration) {
        ApplicationLifecycleDispatcher.onConfigurationChanged(application, newConfig)
    }
}
