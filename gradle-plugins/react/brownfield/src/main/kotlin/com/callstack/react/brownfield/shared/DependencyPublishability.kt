package com.callstack.react.brownfield.shared

/** Matches Maven/Gradle version-range syntax, e.g. `[1.0,2.0)`, `(,2.0]`, `[1.0,)`. */
private val VERSION_RANGE_REGEX = Regex("^[\\[(].*,.*[\\])]$")

/** Reserved Gradle/Maven dynamic-version keywords that resolve to whatever is newest at build time. */
private val DYNAMIC_VERSION_KEYWORDS = setOf("latest.release", "latest.integration", "latest", "release")

/**
 * Whether [dependency] is safe to publish as-is. Rejects dynamic versions (`+`, `latest.*`, ranges)
 * and blank ones: the former resolve non-reproducibly for consumers, the latter emit a
 * `<dependency>` with no version at all.
 */
fun isPublishableCoordinate(dependency: DependencyInfo): Boolean {
    val version = dependency.version
    if (version.isNullOrBlank()) return false
    val trimmed = version.trim()
    if (trimmed.contains("+")) return false
    if (trimmed.lowercase() in DYNAMIC_VERSION_KEYWORDS) return false
    if (VERSION_RANGE_REGEX.matches(trimmed)) return false
    return true
}
