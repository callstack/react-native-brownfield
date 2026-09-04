package com.callstack.react.brownfield.shared

/**
 * Whether [dependency] is safe to publish as-is in a POM/Gradle Module Metadata dependency
 * entry. Rejects dynamic (`+`) versions and missing/blank versions — both produce either a
 * non-reproducible resolution for consumers or (for a blank version) a `<dependency>` node
 * with no version at all, which is exactly the shape of problem the pre-existing
 * `kotlin-build-tools-impl` entry in [Constants.BROWNFIELD_EXPO_TRANSITIVE_DEPS_ARTIFACTS_BLACKLIST]
 * exists to work around on the Expo side.
 */
fun isPublishableCoordinate(dependency: DependencyInfo): Boolean {
    val version = dependency.version
    if (version.isNullOrBlank()) return false
    if (version.contains("+")) return false
    return true
}
