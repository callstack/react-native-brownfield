package com.callstack.react.brownfield.shared

/** Matches Maven/Gradle version-range syntax, e.g. `[1.0,2.0)`, `(,2.0]`, `[1.0,)`. */
private val VERSION_RANGE_REGEX = Regex("^[\\[(].*,.*[\\])]$")

/** Reserved Gradle/Maven dynamic-version keywords that resolve to whatever is newest at build time. */
private val DYNAMIC_VERSION_KEYWORDS = setOf("latest.release", "latest.integration", "latest", "release")

/**
 * Whether [dependency] is safe to publish as-is in a POM/Gradle Module Metadata dependency
 * entry. Rejects dynamic versions (`+` wildcards, `latest.release`/`latest.integration`,
 * Maven-style ranges) and missing/blank versions — all of these produce either a
 * non-reproducible resolution for consumers or (for a blank version) a `<dependency>` node
 * with no version at all, which is exactly the shape of problem the pre-existing
 * `kotlin-build-tools-impl` entry in [Constants.BROWNFIELD_EXPO_TRANSITIVE_DEPS_ARTIFACTS_BLACKLIST]
 * exists to work around on the Expo side.
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
