package com.callstack.reactnativebrownfield

import android.annotation.TargetApi
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import com.facebook.infer.annotation.Assertions
import com.facebook.react.ReactActivity
import com.facebook.react.ReactRootView
import com.facebook.react.devsupport.DoubleTapReloadRecognizer
import com.facebook.react.modules.core.PermissionListener
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler
import com.facebook.react.modules.core.PermissionAwareActivity

private const val MODULE_NAME = "com.callstack.reactnativebrownfield.ACTIVITY_MODULE_NAME"
private const val INITIAL_PROPS = "com.callstack.reactnativebrownfield.ACTIVITY_INITIAL_PROPS"

class ReactNativeActivity : ReactActivity(), DefaultHardwareBackBtnHandler, PermissionAwareActivity {
    private var reactRootView: ReactRootView? = null
    private lateinit var doubleTapReloadRecognizer: DoubleTapReloadRecognizer
    private lateinit var permissionsCallback: Callback
    private var permissionListener: PermissionListener? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val moduleName = intent.getStringExtra(MODULE_NAME)
        val initialProps = intent.getBundleExtra(INITIAL_PROPS)

        reactRootView = ReactRootView(this)
        reactRootView?.startReactApplication(
            ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager,
            moduleName,
            initialProps
        )

        supportActionBar?.hide()

        setContentView(reactRootView)

        doubleTapReloadRecognizer = DoubleTapReloadRecognizer()
    }

    override fun onDestroy() {
        super.onDestroy()
        reactRootView?.unmountReactApplication()
        reactRootView = null

        if (ReactNativeBrownfield.shared.reactNativeHost.hasInstance()) {
            ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager?.onHostDestroy(this)
            ReactNativeBrownfield.shared.reactNativeHost.clear()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (ReactNativeBrownfield.shared.reactNativeHost.hasInstance()) {
            ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager?.onActivityResult(this, requestCode, resultCode, data)
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (ReactNativeBrownfield.shared.reactNativeHost.hasInstance()
            && ReactNativeBrownfield.shared.reactNativeHost.useDeveloperSupport
            && keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD
        ) {
            event.startTracking()
            return true
        }
        return false
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        if(keyCode == KeyEvent.KEYCODE_BACK) {
            onBackPressed()
            return true
        }
        if (ReactNativeBrownfield.shared.reactNativeHost.hasInstance()
            && ReactNativeBrownfield.shared.reactNativeHost.useDeveloperSupport) {
            if (keyCode == KeyEvent.KEYCODE_MENU) {
                ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager.showDevOptionsDialog()
                return true
            }
            val didDoubleTapR = Assertions.assertNotNull(doubleTapReloadRecognizer)
                .didDoubleTapR(keyCode, this.currentFocus)
            if (didDoubleTapR) {
                ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager.devSupportManager.handleReloadJS()
                return true
            }
        }
        return false
    }

    override fun onKeyLongPress(keyCode: Int, event: KeyEvent): Boolean {
        if (ReactNativeBrownfield.shared.reactNativeHost.hasInstance()
            && ReactNativeBrownfield.shared.reactNativeHost.useDeveloperSupport
            && keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD
        ) {
            ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager.showDevOptionsDialog()
            return true
        }
        return false
    }

    override fun onBackPressed() {
        if(ReactNativeBrownfieldModule.shouldPopToNative) {
            super.invokeDefaultOnBackPressed()
        } else if (ReactNativeBrownfield.shared.reactNativeHost.hasInstance()) {
            ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager.onBackPressed()
        }
    }

    override fun invokeDefaultOnBackPressed() {
        super.onBackPressed()
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

    companion object {
        @JvmStatic
        @JvmOverloads
        fun createReactActivityIntent(context: Context, moduleName: String, initialProps: Bundle? = null): Intent {
            val intent = Intent(context, ReactNativeActivity::class.java)
            intent.putExtra(MODULE_NAME, moduleName)
            if (initialProps != null) {
                intent.putExtra(INITIAL_PROPS, initialProps)
            }
            return intent
        }

        @JvmStatic
        fun createReactActivityIntent(context: Context, moduleName: String, initialProps: HashMap<String, *>): Intent {
            return createReactActivityIntent(context, moduleName, PropsBundle.fromHashMap(initialProps))
        }

        @JvmStatic
        fun createReactActivityIntent(context: Context, moduleName: String, initialProps: ReadableMap): Intent {
            return createReactActivityIntent(context, moduleName, initialProps.toHashMap())
        }
    }
}
