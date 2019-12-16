package com.callstack.reactnativebrownfield

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.SimpleViewManager


class ReactNativeBrownfieldPackage : ReactPackage {
    override fun createViewManagers(reactContext: ReactApplicationContext): MutableList<SimpleViewManager<*>> {
        return mutableListOf(ChildrenViewManager())
    }

    override fun createNativeModules(reactContext: ReactApplicationContext): MutableList<NativeModule> {
        return mutableListOf(ReactNativeBrownfieldModule(reactContext))
    }
}