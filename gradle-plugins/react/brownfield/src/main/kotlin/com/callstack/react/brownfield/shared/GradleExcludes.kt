package com.callstack.react.brownfield.shared

import org.gradle.api.Project

/**
 * The variant-independent configurations that feed what the host app gets. A variant's own
 * (`debugRuntimeClasspath`) would leak into every variant, since the published list is shared, and a
 * tool's (lint, detekt) may exclude things the app still needs.
 */
private val PUBLISHED_CONFIG_NAMES = TRANSITIVE_DEPENDENCY_CONFIG_NAMES + "embed"

/**
 * Matches dependencies that a configuration-level `exclude` in the brownfield module keeps out of
 * its build. The plugin reads what embedded libraries declare, not what Gradle resolves, so without
 * this an excluded dependency would still be published and the host app would resolve it. `:app`'s
 * rules are not read: they describe the standalone RN app, which may drop things the host needs.
 */
internal fun gradleExcludesPredicate(project: Project): (groupId: String, artifactId: String) -> Boolean {
    val excludeRules = project.configurations.filter { it.name in PUBLISHED_CONFIG_NAMES }.flatMap { it.excludeRules }
    // Gradle declares these non-null, but an exclude without a group or module leaves it null.
    val rules = excludeRules.map { Pair<String?, String?>(it.group, it.module) }.toSet()
    return { groupId, artifactId ->
        rules.any { (group, module) -> (group == null || group == groupId) && (module == null || module == artifactId) }
    }
}
