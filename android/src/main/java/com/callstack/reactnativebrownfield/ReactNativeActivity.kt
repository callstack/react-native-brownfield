package com.callstack.reactnativebrownfield

import android.annotation.TargetApi
import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import androidx.appcompat.app.AppCompatActivity
import com.facebook.infer.annotation.Assertions
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactRootView
import com.facebook.react.devsupport.DoubleTapReloadRecognizer
import com.facebook.react.modules.core.PermissionListener
import com.facebook.react.bridge.Callback

class ReactNativeActivity : AppCompatActivity() {
    companion object {
        const val MODULE_NAME = "com.callstack.reactnativebrownfield.MODULE_NAME"
    }

    private var reactRootView: ReactRootView? = null
    private lateinit var moduleName: String
    private lateinit var doubleTapReloadRecognizer: DoubleTapReloadRecognizer
    private lateinit var permissionsCallback: Callback
    private var permissionListener: PermissionListener? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        moduleName = intent.getStringExtra(MODULE_NAME)

        reactRootView = ReactRootView(this)
        reactRootView?.startReactApplication(
            BridgeManager.shared.rnHost.reactInstanceManager,
            moduleName,
            null
        )

        supportActionBar?.hide()

        setContentView(reactRootView)

        doubleTapReloadRecognizer = DoubleTapReloadRecognizer()
    }

    override fun onDestroy() {
        super.onDestroy()
        reactRootView?.unmountReactApplication()
        reactRootView = null

        if (BridgeManager.shared.rnHost.hasInstance()) {
            BridgeManager.shared.rnHost.reactInstanceManager.onHostDestroy(this)
        }
    }

    public override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (BridgeManager.shared.rnHost.hasInstance()) {
            BridgeManager.shared.rnHost.reactInstanceManager.onActivityResult(this, requestCode, resultCode, data)
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (BridgeManager.shared.rnHost.hasInstance()
            && BridgeManager.shared.rnHost.getUseDeveloperSupport()
            && keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD
        ) {
            event.startTracking()
            return true
        }
        return false
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        if (BridgeManager.shared.rnHost.hasInstance() && BridgeManager.shared.rnHost.getUseDeveloperSupport()) {
            if (keyCode == KeyEvent.KEYCODE_MENU) {
                BridgeManager.shared.rnHost.getReactInstanceManager().showDevOptionsDialog()
                return true
            }
            val didDoubleTapR = Assertions.assertNotNull<DoubleTapReloadRecognizer>(doubleTapReloadRecognizer)
                .didDoubleTapR(keyCode, this.getCurrentFocus())
            if (didDoubleTapR) {
                BridgeManager.shared.rnHost.getReactInstanceManager().getDevSupportManager().handleReloadJS()
                return true
            }
        }
        return false
    }

    override fun onKeyLongPress(keyCode: Int, event: KeyEvent): Boolean {
        if (BridgeManager.shared.rnHost.hasInstance()
            && BridgeManager.shared.rnHost.getUseDeveloperSupport()
            && keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD
        ) {
            BridgeManager.shared.rnHost.getReactInstanceManager().showDevOptionsDialog()
            return true
        }
        return false
    }

    override fun onBackPressed() {
        if (BridgeManager.shared.rnHost.hasInstance()) {
            BridgeManager.shared.rnHost.getReactInstanceManager().onBackPressed()
        }
    }

    @TargetApi(Build.VERSION_CODES.M)
    fun requestPermissions(
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
}
