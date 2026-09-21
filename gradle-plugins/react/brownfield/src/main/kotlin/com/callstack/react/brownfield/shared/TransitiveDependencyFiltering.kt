package com.callstack.react.brownfield.shared

/**
 * Drops coordinates matching [hardExcludePredicate] — ones that are embedded in the AAR and so
 * would never resolve from Maven. A discovery path can surface these without knowing it: the RNC
 * discoverer has no Expo awareness, so an embedded module depending on an Expo module coordinate
 * would otherwise be published as an ordinary dependency.
 *
 * [hardExcludePredicate] must never include superseded coordinates — those are meant to be
 * re-injected with the mediated version, and dropping them here removes them entirely.
 */
internal fun dropHardExcludedDependencies(
    transitiveDeps: VersionMediatingDependencySet,
    hardExcludePredicate: (groupId: String, artifactId: String) -> Boolean,
): VersionMediatingDependencySet {
    return transitiveDeps.filter { !hardExcludePredicate(it.groupId, it.artifactId) }
}
