package {{PACKAGE_NAME}}

import android.app.Application
import com.callstack.reactnativebrownfield.OnJSBundleLoaded
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.PackageList
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import expo.core.BuildConfig
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory
import expo.modules.ReactNativeHostWrapper

object ReactNativeHostManager {
    fun initialize(application: Application, onJSBundleLoaded: OnJSBundleLoaded? = null) {
        loadReactNative(application)

        ApplicationLifecycleDispatcher.onApplicationCreate(application)


        val reactNativeHost = ReactNativeHostWrapper(
            application,
            object : DefaultReactNativeHost(application) {
                override fun getUseDeveloperSupport(): Boolean {
                    return BuildConfig.DEBUG
                }

                override fun getPackages(): List<ReactPackage> {
                    return PackageList(application).packages
                }

                override fun getJSMainModuleName(): String {
                    return ".expo/.virtual-metro-entry"
                }
            })


        val reactHost: ReactHost by lazy {
            ExpoReactHostFactory.createFromReactNativeHost(
                context = application.applicationContext,
                reactNativeHost = reactNativeHost
            )
        }

        ReactNativeBrownfield.initialize(application, reactHost)
    }
}
