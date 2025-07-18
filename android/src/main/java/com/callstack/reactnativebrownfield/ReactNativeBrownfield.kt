package com.callstack.reactnativebrownfield

import android.app.Application
import android.content.Context
import android.os.Bundle
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactRootView
import com.facebook.react.bridge.ReactContext
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import java.util.concurrent.atomic.AtomicBoolean
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

interface InitializedCallback {
  operator fun invoke(initialized: Boolean)
}

class ReactNativeBrownfield private constructor(val reactNativeHost: ReactNativeHost) {
  companion object {
    private lateinit var instance: ReactNativeBrownfield
    private val initialized = AtomicBoolean()

    @JvmStatic
    val shared: ReactNativeBrownfield get() = instance

    @JvmStatic
    fun initialize(application: Application, rnHost: ReactNativeHost) {
      if (!initialized.getAndSet(true)) {
        instance = ReactNativeBrownfield(rnHost)
        SoLoader.init(application.applicationContext, OpenSourceMergedSoMapping)
      }
    }

    @JvmStatic
    fun initialize(application: Application, options: HashMap<String, Any>) {
      val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(application) {

          override fun getJSMainModuleName(): String {
            return options["mainModuleName"] as? String ?: super.getJSMainModuleName()
          }

          override fun getPackages(): List<ReactPackage> {
            return (options["packages"] as? List<*> ?: emptyList<ReactPackage>())
              .filterIsInstance<ReactPackage>()
          }

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

      initialize(application, reactNativeHost)
    }

    @JvmStatic
    fun initialize(application: Application, packages: List<ReactPackage>) {
      val options = hashMapOf("packages" to packages, "mainModuleName" to "index")

      initialize(application, options)
    }


  }

  fun startReactNative(callback: InitializedCallback?) {
    startReactNative { callback?.invoke(it) }
  }

  @JvmName("startReactNativeKotlin")
  fun startReactNative(callback: ((initialized: Boolean) -> Unit)?) {
    reactNativeHost.reactInstanceManager.addReactInstanceEventListener(object :
      ReactInstanceEventListener {
      override fun onReactContextInitialized(reactContext: ReactContext) {
        callback?.let { it(true) }
        reactNativeHost.reactInstanceManager.removeReactInstanceEventListener(this)
      }
    })
    reactNativeHost.reactInstanceManager?.createReactContextInBackground()

    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
  }

  fun createView(
    context: Context,
    activity: FragmentActivity?,
    moduleName: String,
    reactDelegate: ReactDelegateWrapper? = null,
    launchOptions: Bundle? = null,
  ): FrameLayout {
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      val reactHost = getDefaultReactHost(
        context,
        shared.reactNativeHost
      )

      val resolvedDelegate = reactDelegate ?: ReactDelegateWrapper(activity, reactHost, moduleName, launchOptions)

      val mBackPressedCallback: OnBackPressedCallback = object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
          // invoked for JS stack back navigation
          resolvedDelegate.onBackPressed()
        }
      }

      // Register back press callback
      activity?.onBackPressedDispatcher?.addCallback(mBackPressedCallback)
      // invoked on the last RN screen exit
      resolvedDelegate.setHardwareBackHandler {
        mBackPressedCallback.isEnabled = false
        activity?.onBackPressedDispatcher?.onBackPressed()
      }

      /**
       * When createView method is called in ReactNativeFragment, a reactDelegate
       * instance is required. In such a case, we use the lifeCycle events of the fragment.
       * When createView method is called elsewhere, then reactDelegate is not required.
       * In such a case, we set the lifeCycle observer.
       */
      if (reactDelegate == null) {
        activity?.lifecycle?.addObserver(getLifeCycleObserver(resolvedDelegate))
      }

      resolvedDelegate.loadApp()
      return resolvedDelegate.reactRootView!!
    }

    val instanceManager: ReactInstanceManager? = shared.reactNativeHost?.reactInstanceManager
    val reactView = ReactRootView(context)
    reactView.startReactApplication(
      instanceManager,
      moduleName,
      launchOptions,
    )

    return reactView
  }

  private fun getLifeCycleObserver(reactDelegate: ReactDelegateWrapper): DefaultLifecycleObserver {
    return object : DefaultLifecycleObserver {
      override fun onResume(owner: LifecycleOwner) {
        reactDelegate.onHostResume()
      }

      override fun onPause(owner: LifecycleOwner) {
        reactDelegate.onHostPause()
      }

      override fun onDestroy(owner: LifecycleOwner) {
        reactDelegate.onHostDestroy()
        owner.lifecycle.removeObserver(this) // Cleanup to avoid leaks
      }
    }
  }
}

