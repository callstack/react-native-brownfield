package com.callstack.reactnativebrownfield

import android.os.Bundle
import androidx.activity.ComponentActivity
import com.facebook.react.ReactDelegate
import com.facebook.react.ReactHost
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler

class ReactDelegateWrapper(
    private val activity: ComponentActivity?,
    private val reactHost: ReactHost,
    moduleName: String,
    launchOptions: Bundle?
): ReactDelegate(activity, reactHost, moduleName, launchOptions){
    private lateinit var hardwareBackHandler: () -> Unit
    private val backBtnHandler = DefaultHardwareBackBtnHandler {
        hardwareBackHandler()
    }

    /**
     * This is invoked when there is no more RN Stack to pop.
     * What it means that this is now the initial RN screen.
     */
    fun setHardwareBackHandler(backHandler: () -> Unit) {
        hardwareBackHandler = backHandler
    }

    override fun onHostResume() {
        reactHost.onHostResume(activity, backBtnHandler)
    }
}