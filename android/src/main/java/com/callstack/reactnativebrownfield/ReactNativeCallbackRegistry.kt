package com.callstack.reactnativebrownfield

interface ReactNativeCallback {
    operator fun invoke()
}

object ReactNativeCallbackRegistry {
    fun registerCallback(uuid: String, handlerName: String, callback: ReactNativeCallback) {
        if (!registry.containsKey(uuid)) {
            registry[uuid] = hashMapOf()
        }

        registry[uuid]?.set(handlerName, callback)
    }

    fun invokeCallback(uuid: String, handlerName: String) {
       registry[uuid]?.get(handlerName)?.invoke()
    }

    private val registry: HashMap<String, HashMap<String, ReactNativeCallback>> = hashMapOf()
}