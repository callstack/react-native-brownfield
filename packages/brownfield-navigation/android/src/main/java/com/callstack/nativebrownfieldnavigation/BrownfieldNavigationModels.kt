package com.callstack.nativebrownfieldnavigation

import com.facebook.react.bridge.ReadableMap

data class UserType (
    val avatar: Avatar? = null,
    val email: String? = null,
    val flags: List<String>,
    val id: String,
    val ids: List<String>? = null,
    val name: String
)

data class Avatar (
    val url: String
)


fun toUserType(value: ReadableMap): UserType {
    return UserType(avatar = value.getMap("avatar")?.let { toAvatar(it) }, email = value.getString("email"), flags = readStringArray(value, "flags", true)!!, id = value.getString("id")!!, ids = readStringArray(value, "ids", false), name = value.getString("name")!!)
}

fun toAvatar(value: ReadableMap): Avatar {
    return Avatar(url = value.getString("url")!!)
}

private fun readStringArray(value: ReadableMap, key: String, required: Boolean): List<String>? {
    if (!value.hasKey(key) || value.isNull(key)) {
        if (required) error("Missing required array field '$key'")
        return null
    }
    val array = value.getArray(key) ?: return null
    return array.toArrayList().map {
        it as? String ?: error("Expected string elements for array field '$key'")
    }
}