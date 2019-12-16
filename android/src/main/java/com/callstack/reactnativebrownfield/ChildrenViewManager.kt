package com.callstack.reactnativebrownfield

import android.widget.FrameLayout
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp


class ChildrenViewManager : SimpleViewManager<FrameLayout>() {
    companion object {
        val REACT_CLASS = "ChildrenView"
    }

    override fun getName(): String {
        return REACT_CLASS
    }

    override fun createViewInstance(context: ThemedReactContext): FrameLayout {
        return FrameLayout(context)
    }

    @ReactProp(name = "uuid")
    fun setUuid(view: FrameLayout, uuid: String) {
        view.addView(ReactNativeBrownfield.shared.getRegisteredView(uuid))
    }
}


