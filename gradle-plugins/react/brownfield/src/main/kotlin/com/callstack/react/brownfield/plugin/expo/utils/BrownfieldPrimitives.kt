package com.callstack.react.brownfield.plugin.expo.utils

data class BrownfieldPublishingInfo(
    val groupId: String,
    val artifactId: String,
    val version: String,
)

data class POMDependency(
    val groupId: String,
    val artifactId: String,
    val version: String?,
    val scope: String,
    val optional: Boolean
)

// TODO: should this be deleted? data class FilterPackageInfo(
//    val groupId: String,
//    val artifactId: String,
//)

/**
 * A set that stores POMDependency objects based only on their groupId and artifactId.
 * When adding a new dependency with the same groupId and artifactId,
 * it compares the versions and keeps the one with the higher version.
 */
open class VersionMediatingSet {
    private val backingMap = mutableMapOf<Pair<String, String>, POMDependency>()

    val size: Int get() = backingMap.size

    fun contains(element: POMDependency): Boolean {
        return backingMap.containsKey(element.groupId to element.artifactId)
    }

    fun add(element: POMDependency): Boolean {
        val key = element.groupId to element.artifactId
        val existing = backingMap[key]

        if (existing == null) {
            backingMap[key] = element
            return true
        }

        // compare versions - replace if new version is greater (behavior of Gradle itself)
        val existingVersion = existing.version
        val newVersion = element.version

        if (newVersion != null && (existingVersion == null || compareVersions(
                newVersion,
                existingVersion
            ) > 0)
        ) {
            backingMap[key] = element
            return true
        }

        return false
    }

    fun forEach(action: (POMDependency) -> Unit) {
        backingMap.values.forEach(action)
    }

    fun addAll(elements: Collection<POMDependency>): Boolean {
        var modified = false
        elements.forEach { if (add(it)) modified = true }
        return modified
    }

    private fun compareVersions(version1: String, version2: String): Int {
        val parts1 = version1.split('.', '-').map { it.toIntOrNull() ?: 0 }
        val parts2 = version2.split('.', '-').map { it.toIntOrNull() ?: 0 }
        val maxLength = maxOf(parts1.size, parts2.size)

        for (i in 0 until maxLength) {
            val part1 = parts1.getOrNull(i) ?: 0
            val part2 = parts2.getOrNull(i) ?: 0
            val comparison = part1.compareTo(part2)
            if (comparison != 0) return comparison
        }

        return 0
    }
}
