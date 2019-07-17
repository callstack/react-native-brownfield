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
import com.facebook.react.common.LifecycleState
import com.facebook.react.devsupport.DoubleTapReloadRecognizer
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

private const val MODULE_NAME = "com.callstack.reactnativebrownfield.FRAGMENT_MODULE_NAME"

class ReactNativeFragment : Fragment(), PermissionAwareActivity {

    private var reactRootView: ReactRootView? = null
    private lateinit var moduleName: String
    private lateinit var doubleTapReloadRecognizer: DoubleTapReloadRecognizer
    private lateinit var permissionsCallback: Callback
    private var permissionListener: PermissionListener? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        moduleName = arguments!!.getString(MODULE_NAME)!!

        doubleTapReloadRecognizer = DoubleTapReloadRecognizer()
    }


    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {

        reactRootView = ReactRootView(context)
        reactRootView?.startReactApplication(
            BridgeManager.shared.reactNativeHost.reactInstanceManager,
            moduleName,
            null
        )

        return reactRootView!!
    }

    override fun onResume() {
        super.onResume()
        if (BridgeManager.shared.reactNativeHost.hasInstance()) {
            BridgeManager.shared.reactNativeHost.reactInstanceManager?.onHostResume(
                activity,
                activity as DefaultHardwareBackBtnHandler
            )
        }
    }

    override fun onPause() {
        super.onPause()
        if (BridgeManager.shared.reactNativeHost.hasInstance()) {
            BridgeManager.shared.reactNativeHost.reactInstanceManager?.onHostPause(
                activity
            )
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        reactRootView?.unmountReactApplication()
        reactRootView = null
        if (BridgeManager.shared.reactNativeHost.hasInstance()) {
            val reactInstanceMgr = BridgeManager.shared.reactNativeHost.reactInstanceManager

            if (reactInstanceMgr.lifecycleState != LifecycleState.RESUMED) {
                reactInstanceMgr.onHostDestroy(activity)
                BridgeManager.shared.reactNativeHost.clear()
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
        return activity!!.checkPermission(permission, pid, uid)
    }

    @TargetApi(Build.VERSION_CODES.M)
    override fun checkSelfPermission(permission: String): Int {
        return activity!!.checkSelfPermission(permission)
    }

    @TargetApi(Build.VERSION_CODES.M)
    override fun requestPermissions(
        permissions: Array<String>,
        requestCode: Int,
        listener: PermissionListener
    ) {
        permissionListener = listener
        this.requestPermissions(permissions, requestCode)
    }

    fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        var handled = false
        if (BridgeManager.shared.reactNativeHost.useDeveloperSupport && BridgeManager.shared.reactNativeHost.hasInstance()) {
            if (keyCode == KeyEvent.KEYCODE_MENU) {
                BridgeManager.shared.reactNativeHost.reactInstanceManager.showDevOptionsDialog()
                handled = true
            }
            val didDoubleTapR = Assertions.assertNotNull(doubleTapReloadRecognizer)
                .didDoubleTapR(keyCode, activity?.currentFocus)
            if (didDoubleTapR) {
                BridgeManager.shared.reactNativeHost.reactInstanceManager.devSupportManager.handleReloadJS()
                handled = true
            }
        }
        return handled
    }

    fun onBackPressed(backBtnHandler: DefaultHardwareBackBtnHandler) {
        if(ReactNativeBrownfieldModule.shouldPopToNative) {
            backBtnHandler.invokeDefaultOnBackPressed()
        } else if (BridgeManager.shared.reactNativeHost.hasInstance()) {
            BridgeManager.shared.reactNativeHost.reactInstanceManager.onBackPressed()
        }
    }

    companion object {
        @JvmStatic
        fun createReactNativeFragment(moduleName: String): ReactNativeFragment {
            val fragment = ReactNativeFragment()
            val args = Bundle()
            args.putString(MODULE_NAME, moduleName)
            fragment.arguments = args
            return fragment
        }
    }

}