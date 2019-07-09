package com.callstack.reactnativebrownfield

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactNativeHost

class ReactNativeActivity : ReactActivity() {
    companion object {
        const val MODULE_NAME = "com.callstack.reactnativebrownfield.MODULE_NAME"
    }

    var moduleName: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        moduleName = intent.getStringExtra(MODULE_NAME)
    }

    override fun getMainComponentName(): String? {
        return moduleName
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object : ReactActivityDelegate(this, moduleName) {
            override fun getReactNativeHost(): ReactNativeHost {
                return BridgeManager.shared.rnHost
            }
        }
    }
}
