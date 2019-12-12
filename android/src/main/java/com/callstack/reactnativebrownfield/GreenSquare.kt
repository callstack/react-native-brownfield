package com.callstack.reactnativebrownfield

import android.content.Context
import android.util.AttributeSet

class GreenSquare
    @JvmOverloads constructor (
        context: Context,
        var text: String?
    ): UIComponent(context) {
    init {
        addReactSubview()
    }

    override fun getProps(): HashMap<String, Any> {
        val map = hashMapOf<String, Any>()

        if (text != null) {
            map["text"] = text!!
        }

        return map
    }

    override fun addReactSubview() {
        reactComponent = ReactNativeComponentFactory.create(
            ComponentTypes.GreenSquare,
            context,
            getProps()
        )
        addView(reactComponent)
    }
}


