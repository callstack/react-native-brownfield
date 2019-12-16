package com.callstack.reactnativebrownfield

import android.content.Context
import android.os.Handler
import android.util.AttributeSet
import android.view.View
import android.widget.FrameLayout


abstract class UIComponent: FrameLayout {
    constructor(context: Context): super(context)
    constructor(context: Context, attrs: AttributeSet?): super(context, attrs)
    constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int): super(context, attrs, defStyleAttr)

    var reactComponent: ReactNativeComponent? = null
    var hasChildren = false

    protected abstract fun addReactSubview()
    protected open fun getProps() : HashMap<String, Any> {
        val map = hashMapOf<String, Any>("hasChildren" to hasChildren)

        if (reactComponent != null) {
            map["uuid"] = reactComponent!!.uuid
        }

        return map
    }

    private fun updateProps() {
        val mainHandler = Handler(context.mainLooper)

        val map = getProps()

        mainHandler.post {
            reactComponent?.appProperties = PropsBundle.fromHashMap(map)
        }
    }

    protected fun initializeReactSubview() {
        super.addView(reactComponent)
    }

    override fun addView(child: View?) {
        if (child != null && reactComponent != null) {
            hasChildren = true
            updateProps()
            ReactNativeBrownfield.shared.registerView(reactComponent!!.uuid, child)
        }
    }

    override fun removeAllViews() {
        super.removeAllViews()
        if (reactComponent != null) {
            hasChildren = false
            updateProps()
            ReactNativeBrownfield.shared.unregisterView(reactComponent!!.uuid)
        }

    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        updateProps()
    }
}