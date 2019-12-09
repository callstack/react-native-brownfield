package com.callstack.reactnativebrownfield

import android.content.Context
import android.os.Bundle
import com.facebook.react.ReactRootView
import com.facebook.react.bridge.WritableMap

enum class ComponentTypes {
    GreenSquare,
    RedSquare,
}

val pressHandlers = arrayOf("onPress")

class ReactNativeComponentFactory {
    companion object {
        private fun createComponent(
            type: ComponentTypes,
            context: Context,
            initialProps: Bundle? = null,
            pressHandlers: HashMap<String, ReactNativeCallback>? = null
        ): ReactRootView {
            return when (type) {
                ComponentTypes.GreenSquare ->
                         createReactNativeComponent("GreenSquare", context, initialProps, pressHandlers)
                ComponentTypes.RedSquare ->
                         createReactNativeComponent("RedSquare", context, initialProps, pressHandlers)
            }
        }

        @JvmStatic
        @JvmOverloads
        fun create(
            type: ComponentTypes,
            context: Context,
            initialProps: HashMap<String, *>? = null
        ): ReactRootView {
            if (initialProps == null) {
                return createComponent(type, context)
            }

            val pressHandlerProps = hashMapOf<String, ReactNativeCallback>()

            pressHandlers.forEach {
                val value = initialProps[it]
                if (value != null) {
                    pressHandlerProps[it] = value as ReactNativeCallback
                    initialProps.remove(it)
                }
            }

            return createComponent(type, context, PropsBundle.fromHashMap(initialProps), pressHandlerProps)
        }
    }
}



private fun createReactNativeComponent(
    moduleName: String,
    context: Context,
    initialProps: Bundle? = null,
    pressHandlers: HashMap<String, ReactNativeCallback>? = null
): ReactRootView {
    val reactRootView = ReactNativeComponent(context)
    reactRootView?.startReactApplication(
        ReactNativeBrownfield.shared.reactNativeHost.reactInstanceManager,
        moduleName,
        initialProps,
        pressHandlers
    )

    return reactRootView
}