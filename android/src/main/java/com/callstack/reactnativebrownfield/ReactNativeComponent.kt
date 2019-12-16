package com.callstack.reactnativebrownfield

import android.content.Context
import android.os.Bundle
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactRootView
import java.util.*
import kotlin.collections.HashMap

class ReactNativeComponent(context: Context): ReactRootView(context) {
    val uuid = UUID.randomUUID().toString()

    fun startReactApplication(
        reactInstanceManager: ReactInstanceManager?,
        moduleName: String?,
        initialProperties: Bundle?,
        pressHandlers: HashMap<String, ReactNativeCallback>?
    ) {
        initialProperties?.putString("uuid", uuid)

        pressHandlers?.forEach {
            ReactNativeCallbackRegistry.registerCallback(uuid, it.key, it.value)
        }

        super.startReactApplication(reactInstanceManager, moduleName, initialProperties)
    }
}
