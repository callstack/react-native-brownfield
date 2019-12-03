package com.callstack.reactnativebrownfield

import android.content.Context
import android.os.Bundle
import com.facebook.react.ReactRootView
import com.facebook.react.bridge.WritableMap

enum class ComponentTypes {
    GreenSquare,
    RedSquare,
}

class ReactNativeComponentFactory {
    companion object {
        @JvmStatic
        @JvmOverloads
        fun create(type: ComponentTypes, context: Context, initialProps: Bundle? = null): ReactRootView {
            return when (type) {
                ComponentTypes.GreenSquare ->
                         createReactNativeComponent("GreenSquare", context, initialProps)
                ComponentTypes.RedSquare ->
                         createReactNativeComponent("RedSquare", context, initialProps)
            }
        }

        @JvmStatic
        fun create(type: ComponentTypes, context: Context, initialProps: HashMap<String, *>): ReactRootView {
            return create(type, context, PropsBundle.fromHashMap(initialProps))
        }

        @JvmStatic
        fun create(type: ComponentTypes, context: Context, initialProps: WritableMap): ReactRootView {
            return create(type, context, initialProps.toHashMap())
        }

    }
}

private fun createReactNativeComponent(
    moduleName: String,
    context: Context,
    initialProps: Bundle? = null
): ReactRootView {
    val reactRootView = ReactRootView(context)
    reactRootView?.startReactApplication(
        ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager,
        moduleName,
        initialProps
    )

    return reactRootView
}