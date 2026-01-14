package com.rnapp.brownfieldlib

data class SettingsStore (
    val notificationsEnabled: Boolean,
    val privacyMode: Boolean,
    val theme: Theme
) {
    companion object {
        const val STORE_NAME = "SettingsStore"
    }
}

enum class Theme {
    Dark,
    Light
}
