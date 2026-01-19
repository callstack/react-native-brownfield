package com.callstack.react.brownfield.shared

import kotlinx.serialization.json.Json

object JsonInstance {
    val json = Json {
        prettyPrint = false
        encodeDefaults = true
        ignoreUnknownKeys = true
    }
}