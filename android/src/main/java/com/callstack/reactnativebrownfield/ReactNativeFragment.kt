package com.callstack.reactnativebrownfield;

import android.annotation.TargetApi
import android.os.Build
import android.os.Bundle
import androidx.fragment.app.Fragment
import android.view.KeyEvent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.facebook.infer.annotation.Assertions
import com.facebook.react.ReactRootView
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.WritableMap
import com.facebook.react.common.LifecycleState
import com.facebook.react.devsupport.DoubleTapReloadRecognizer
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

private const val MODULE_NAME = "com.callstack.reactnativebrownfield.FRAGMENT_MODULE_NAME"
private const val INITIAL_PROPS = "com.callstack.reactnativebrownfield.FRAGMENT_INITIAL_PROPS"

class ReactNativeFragment : Fragment(), PermissionAwareActivity {

    private var reactRootView: ReactRootView? = null
    private lateinit var doubleTapReloadRecognizer: DoubleTapReloadRecognizer
    private lateinit var permissionsCallback: Callback
    private var permissionListener: PermissionListener? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val moduleName = arguments?.getString(MODULE_NAME)!!
        val initialProps = arguments?.getBundle(INITIAL_PROPS)

        doubleTapReloadRecognizer = DoubleTapReloadRecognizer()

        reactRootView = ReactRootView(context)
        reactRootView?.startReactApplication(
            ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager,
            moduleName,
            initialProps
        )
    }


    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return reactRootView!!
    }

    override fun onResume() {
        super.onResume()
        if (ReactNativeBrownfield.shared.reactNativeHost.hasInstance()) {
            ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager?.onHostResume(
                activity,
                activity as DefaultHardwareBackBtnHandler
            )
        }
    }

    override fun onPause() {
        super.onPause()
        if (ReactNativeBrownfield.shared.reactNativeHost.hasInstance()) {
            ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager?.onHostPause(
                activity
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        reactRootView?.unmountReactApplication()
        reactRootView = null
        if (ReactNativeBrownfield.shared.reactNativeHost.hasInstance()) {
            val reactInstanceMgr = ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager

            if (reactInstanceMgr.lifecycleState != LifecycleState.RESUMED) {
                reactInstanceMgr.onHostDestroy(activity)
            }
        }
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

    fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
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
                ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager.devSupportManager.handleReloadJS()
                handled = true
            }
        }
        return handled
    }

    fun onBackPressed(backBtnHandler: DefaultHardwareBackBtnHandler) {
        if(ReactNativeBrownfieldModule.shouldPopToNative) {
            backBtnHandler.invokeDefaultOnBackPressed()
        } else if (ReactNativeBrownfield.shared.reactNativeHost.hasInstance()) {
            ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager.onBackPressed()
        }
    }

    companion object {
        @JvmStatic
        @JvmOverloads
        fun createReactNativeFragment(moduleName: String, initialProps: Bundle? = null): ReactNativeFragment {
            val fragment = ReactNativeFragment()
            val args = Bundle()
            args.putString(MODULE_NAME, moduleName)
            if (initialProps != null) {
                args.putBundle(INITIAL_PROPS, initialProps)
            }
            fragment.arguments = args
            return fragment
        }

        @JvmStatic
        fun createReactNativeFragment(moduleName: String, initialProps: HashMap<String, *>): ReactNativeFragment {
            return createReactNativeFragment(moduleName, PropsBundle.fromHashMap(initialProps))
        }

        @JvmStatic
        fun createReactNativeFragment(moduleName: String, initialProps: WritableMap): ReactNativeFragment {
            return createReactNativeFragment(moduleName, initialProps.toHashMap())
        }
    }

}
