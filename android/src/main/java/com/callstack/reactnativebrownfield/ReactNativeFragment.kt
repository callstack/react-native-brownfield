package com.callstack.reactnativebrownfield;

import android.annotation.TargetApi
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.facebook.infer.annotation.Assertions
import com.facebook.react.ReactFragment
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.WritableMap
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.devsupport.DoubleTapReloadRecognizer
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

class ReactNativeFragment : ReactFragment(), PermissionAwareActivity {
  private lateinit var doubleTapReloadRecognizer: DoubleTapReloadRecognizer
  private lateinit var permissionsCallback: Callback
  private var permissionListener: PermissionListener? = null
  private lateinit var moduleName: String

  override fun onCreate(savedInstanceState: Bundle?) {
    /**
     * ReactFragment.onCreate will throw an exception if we do not provide arg_component_name as arguments.
     * We silently catch this exception. The reason is we want to invoke the super<Fragment>.onCreate in
     * ReactFragment. Then initialise the mReactDelegate with ReactDelegateWrapper instead of ReactDelegate.
     *
     * So we purposely force ReactFragment.onCreate to throw an exception, so that we can provide our own
     * implementation for mReactDelegate: ReactDelegateWrapper
     */
    try{
      super.onCreate(savedInstanceState)
    } catch (e: IllegalStateException){
      Log.w("ReactNativeFragment", "ReactFragment threw due to missing arg_component_name: ${e.message} - This is an expected behaviour.")
    }

    moduleName = arguments?.getString(ARG_MODULE_NAME)!!
    this.mReactDelegate = this.reactHost?.let {
      ReactDelegateWrapper(activity,
        it, moduleName, arguments?.getBundle("arg_launch_options"))
    }

    doubleTapReloadRecognizer = DoubleTapReloadRecognizer()
  }

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?
  ): View {
    return ReactNativeBrownfield.shared.createView(this.requireContext(), activity, moduleName, this.mReactDelegate as ReactDelegateWrapper)
  }

  override fun getReactHost(): ReactHost? {
    return activity?.let {
      getDefaultReactHost(
        it.applicationContext,
        ReactNativeBrownfield.shared.reactNativeHost
      )
    }
  }

  override fun getReactNativeHost(): ReactNativeHost? {
    return ReactNativeBrownfield.shared.reactNativeHost
  }

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<String>,
    grantResults: IntArray
  ) {
    permissionsCallback = Callback {
      if (permissionListener != null) {
        permissionListener?.onRequestPermissionsResult(
          requestCode,
          permissions,
          grantResults
        )

        permissionListener = null
      }
    }
  }

  override fun checkPermission(permission: String, pid: Int, uid: Int): Int {
    return requireActivity().checkPermission(permission, pid, uid)
  }

  @TargetApi(Build.VERSION_CODES.M)
  override fun checkSelfPermission(permission: String): Int {
    return requireActivity().checkSelfPermission(permission)
  }

  override fun requestPermissions(
    permissions: Array<String>,
    requestCode: Int,
    listener: PermissionListener?
  ) {
    permissionListener = listener
    this.requestPermissions(permissions, requestCode)
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
    var handled = false
    if (ReactNativeBrownfield.shared.reactNativeHost.useDeveloperSupport && ReactNativeBrownfield.shared.reactNativeHost.hasInstance()) {
      if (keyCode == KeyEvent.KEYCODE_MENU) {
        ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager.showDevOptionsDialog()
        handled = true
      }
      val didDoubleTapR = activity?.currentFocus?.let {
        Assertions.assertNotNull(doubleTapReloadRecognizer)
          .didDoubleTapR(keyCode, it)
      }
      if (didDoubleTapR == true) {
        reactDelegate.reload()
        handled = true
      }
    }
    return handled
  }

  companion object {
    private const val ARG_MODULE_NAME = "arg_module_name"

    @JvmStatic
    @JvmOverloads
    fun createReactNativeFragment(
      moduleName: String,
      initialProps: Bundle? = null
    ): ReactNativeFragment {
      val fragment = ReactNativeFragment()
      val args = Bundle()
      args.putString(ARG_MODULE_NAME, moduleName)
      if (initialProps != null) {
        args.putBundle(ARG_LAUNCH_OPTIONS, initialProps)
      }
      fragment.arguments = args
      return fragment
    }

    @JvmStatic
    fun createReactNativeFragment(
      moduleName: String,
      initialProps: HashMap<String, *>
    ): ReactNativeFragment {
      return createReactNativeFragment(moduleName, PropsBundle.fromHashMap(initialProps))
    }

    @JvmStatic
    fun createReactNativeFragment(
      moduleName: String,
      initialProps: WritableMap
    ): ReactNativeFragment {
      return createReactNativeFragment(moduleName, initialProps.toHashMap())
    }
  }

}
