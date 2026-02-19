package com.callstack.react.brownfield.expo.utils

import io.github.g00fy2.versioncompare.Version

/**
 * A set that stores DependencyInfo objects based only on their groupId and artifactId.
 * When adding a new dependency with the same groupId and artifactId,
 * it compares the versions and keeps the one with the higher version.
 */
open class VersionMediatingDependencySet : Iterable<DependencyInfo> {
    private var backingMap =
        mutableMapOf<Pair<String, String>, DependencyInfo>()

    val size: Int get() = backingMap.size

    fun contains(element: DependencyInfo): Boolean {
        return backingMap.containsKey(element.groupId to element.artifactId)
    }

    fun add(element: DependencyInfo): Boolean {
        val key = element.groupId to element.artifactId
        val existing = backingMap[key]

        if (existing == null) {
            backingMap[key] = element
            return true
        }

        // compare versions - replace if new version is greater (behavior of Gradle itself)
        val existingVersion = existing.version
        val newVersion = element.version

        if (newVersion != null && (
                existingVersion == null || compareVersions(
                    newVersion,
                    existingVersion,
                ) > 0
            )
        ) {
            backingMap[key] = element
            return true
        }

        return false
    }

    fun forEach(action: (DependencyInfo) -> Unit) {
        backingMap.values.forEach(action)
    }

    fun filter(predicate: (DependencyInfo) -> Boolean): VersionMediatingDependencySet {
        backingMap =
            backingMap.filter {
                predicate(it.value)
            }.toMutableMap()

        return this
    }

    fun addAll(elements: Iterable<DependencyInfo>): Boolean {
        var modified = false
        elements.forEach { if (add(it)) modified = true }
        return modified
    }

    fun removeAll(predicate: (it: DependencyInfo) -> Boolean): List<DependencyInfo?> {
        val keysToBeRemoved = mutableSetOf<Pair<String, String>>()

        forEach {
            if (predicate(it)) {
                keysToBeRemoved.add(it.groupId to it.artifactId)
            }
        }

        return keysToBeRemoved.map {
            backingMap.remove(it)
        }
    }

    private fun compareVersions(
        version1: String,
        version2: String,
    ): Int {
        return Version(version1).compareTo(Version(version2))
    }

    override fun iterator(): Iterator<DependencyInfo> {
        return backingMap.values.iterator()
    }

    companion object {
        fun from(source: Iterable<DependencyInfo>): VersionMediatingDependencySet {
            val instance = VersionMediatingDependencySet()

            instance.addAll(source)

            return instance
        }
    }
}
