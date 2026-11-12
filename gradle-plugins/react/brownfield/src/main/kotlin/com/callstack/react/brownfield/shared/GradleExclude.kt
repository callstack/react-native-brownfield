package com.callstack.react.brownfield.shared

import org.gradle.api.Project

/**
 * The variant-independent configurations that feed what the host app gets. A variant's own
 * (`debugRuntimeClasspath`) would leak into every variant, since the published list is shared, and a
 * tool's (lint, detekt) may exclude things the app still needs.
 */
private val PUBLISHED_CONFIG_NAMES = TRANSITIVE_DEPENDENCY_CONFIG_NAMES + "embed"

/**
 * The configuration-level excludes that keep a dependency out of the brownfield module's build.
 * The plugin reads what embedded libraries declare, not what Gradle resolves, so without these an
 * excluded dependency would still be published and the host app would resolve it. `:app`'s rules
 * are not read: they describe the standalone RN app, which may drop things the host needs.
 */
internal fun gradleExcludes(project: Project): List<GradleExclude> =
    project.configurations
        .filter { it.name in PUBLISHED_CONFIG_NAMES }
        .flatMap { it.excludeRules }
        .map { GradleExclude(it.group, it.module) }
        .distinct()

/** One exclude rule. Gradle types both parts as non-null, but a rule without one leaves it null. */
internal data class GradleExclude(val group: String?, val module: String?) {
    fun matches(
        groupId: String,
        artifactId: String,
    ) = (group == null || group == groupId) && (module == null || module == artifactId)
}
