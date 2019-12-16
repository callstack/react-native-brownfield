package com.callstack.reactnativebrownfield

import android.content.Context

class GreenSquare
    @JvmOverloads constructor (
        context: Context,
        var text: String?
    ): UIComponent(context) {
    init {
        addReactSubview()
    }

    override fun getProps(): HashMap<String, Any> {
        val map = super.getProps()

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
        initializeReactSubview()
    }
}
