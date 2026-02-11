package com.callstack.react.brownfield.expo.utils

import com.callstack.react.brownfield.shared.Logging
import com.callstack.react.brownfield.utils.capitalized
import java.lang.reflect.Method
import java.lang.reflect.Proxy

object ReflectionUtils {

    fun invokeMethod(obj: Any?, method: Method): Any? {
        try {
            return obj?.javaClass
                ?.getMethod(method.name)
                ?.invoke(obj)
        } catch (_: NoSuchMethodException) {
            try {
                return obj?.javaClass
                    ?.getMethod("get${method.name.capitalized()}")
                    ?.invoke(obj)
            } catch (e: NoSuchMethodException) {
                Logging.error(
                    "Method ${method.name} nor a getter for this name have not been found on ExpoGradleProjectProjection",
                    e
                )
            }
        }

        return null
    }

    fun <T : Any> wrapObjectProxy(
        target: Any,
        projection: Class<T>,
        nested: List<Class<*>> = emptyList()
    ): T {
        @Suppress("UNCHECKED_CAST")
        return Proxy.newProxyInstance(
            projection.classLoader,
            arrayOf(projection)
        ) { _, method, _ ->
            val value = invokeMethod(target, method)

            // wrap defined nested objects
            if (value != null) {
                if (nested.contains(method.returnType)) {
                    val nestedProjection = method.returnType

                    return@newProxyInstance when {
                        value is Iterable<*> -> {
                            value.map { wrapObjectProxy(it!!, nestedProjection) }
                        }

                        else -> {
                            wrapObjectProxy(
                                value,
                                nestedProjection
                            )
                        }
                    }
                }
            }

            value
        } as T
    }
}

fun Any.asExpoGradleProjectProjection(): ExpoGradleProjectProjection {
    return ReflectionUtils.wrapObjectProxy(
        this,
        ExpoGradleProjectProjection::class.java,
        nested = listOf(
            ExpoPublication::class.java
        )
    )
}
