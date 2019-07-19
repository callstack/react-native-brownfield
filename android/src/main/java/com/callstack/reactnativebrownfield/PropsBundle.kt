package com.callstack.reactnativebrownfield

import android.os.Bundle
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import java.util.ArrayList

object PropsBundle {
    fun fromHashMap(map: HashMap<String, *>): Bundle {
        val bundle = Bundle()
        map.forEach {
            when (it.value) {
                is ArrayList<*> -> {
                    bundle.putSerializable(it.key, it.value as ArrayList<*>)
                }
                is ReadableArray -> {
                    bundle.putSerializable(it.key, (it.value as ReadableArray).toArrayList())
                }
                is HashMap<*, *> -> {
                    bundle.putBundle(it.key, fromHashMap(it.value as HashMap<String, *>))
                }
                is ReadableMap -> {
                    bundle.putBundle(it.key, fromHashMap((it.value as ReadableMap).toHashMap()))
                }
                is Boolean -> {
                    bundle.putBoolean(it.key, it.value as Boolean)
                }
                is Int -> {
                    bundle.putInt(it.key, it.value as Int)
                }
                is String -> {
                    bundle.putString(it.key, it.value as String)
                }
                is Double -> {
                    bundle.putDouble(it.key, it.value as Double)
                }
                else -> {
                    bundle.putSerializable(it.key, null)
                }
            }
        }

        return bundle
    }
}