package com.callstack.react.brownfield.shared

/**
 * Drops any coordinate matching [hardExcludePredicate] from [transitiveDeps] in place, returning
 * it for chaining.
 *
 * This exists because a discovery path can find a coordinate that must never be published as an
 * external dependency, without knowing that itself. In particular, `RncTransitiveDependencyDiscoverer`
 * has no awareness of the Expo blacklist: an embedded non-Expo module can legitimately declare a
 * dependency on one of Expo's own module coordinates (e.g. `host.exp.exponent:expo.modules.device`),
 * and that coordinate would otherwise get published as a regular Maven dependency — one that
 * doesn't actually resolve anywhere, since Expo's own modules are embedded, not published
 * standalone artifacts.
 *
 * Deliberately distinct from "superseded" coordinates (a stale pre-existing entry being replaced
 * by a higher, mediated version): those must still survive this filter and be (re-)injected, so
 * [hardExcludePredicate] must never include the supersede check — only unconditional exclusions
 * (Expo blacklist, root-project self-reference, embedded modules' own coordinates).
 */
internal fun dropHardExcludedDependencies(
    transitiveDeps: VersionMediatingDependencySet,
    hardExcludePredicate: (groupId: String, artifactId: String) -> Boolean,
): VersionMediatingDependencySet {
    return transitiveDeps.filter { !hardExcludePredicate(it.groupId, it.artifactId) }
}
