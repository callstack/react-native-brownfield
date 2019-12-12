package com.callstack.reactnativebrownfield

import android.content.Context
import android.os.Handler
import android.util.AttributeSet
import android.widget.FrameLayout


abstract class UIComponent: FrameLayout {
    constructor(context: Context): super(context)
    constructor(context: Context, attrs: AttributeSet?): super(context, attrs)
    constructor(context: Context, attrs: AttributeSet?, defStyleAttr: Int): super(context, attrs, defStyleAttr)

    protected lateinit var reactComponent: ReactNativeComponent

    protected abstract fun addReactSubview()
    protected abstract fun getProps() : HashMap<String, Any>

    fun updateProps() {
        val mainHandler = Handler(context.mainLooper)

        mainHandler.post {
            reactComponent.appProperties = PropsBundle.fromHashMap(getProps())
        }
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        updateProps()
    }


}