package com.callstack.reactnativebrownfield.utils

object VersionUtils {
    fun isVersionLessThan(version: String, threshold: String): Boolean {
        val versionParts = version.split(".").map { it.toIntOrNull() ?: 0 }
        val thresholdParts = threshold.split(".").map { it.toIntOrNull() ?: 0 }

        val maxLength = maxOf(versionParts.size, thresholdParts.size)
        for (i in 0 until maxLength) {
            val vPart = versionParts.getOrNull(i) ?: 0
            val tPart = thresholdParts.getOrNull(i) ?: 0
            if (vPart != tPart) return vPart < tPart
        }
        
        return false // equal versions are not less than
    }
}