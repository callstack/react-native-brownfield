package com.callstack.react.brownfield.utils

import org.gradle.api.GradleException
import org.gradle.api.Project
import org.gradle.api.file.DirectoryProperty
import java.lang.reflect.Method

/**
 * Finds `taskName`'s `getterName()` that returns a `DirectoryProperty`. Resolving the task by name
 * (rather than importing its class) keeps this plugin from depending on RNGP's/expo-updates'
 * internal task types. If the task, or the property, isn't there, this fails the build with a
 * clear message instead of silently producing an empty or stale directory.
 */
internal fun directoryGetter(
    appProject: Project,
    taskName: String,
    getterName: String,
): Method {
    val task =
        appProject.tasks.findByName(taskName)
            ?: throw GradleException(
                "brownfield: expected task '$taskName' was not found in project " +
                    "'${appProject.path}'. Check that the plugin producing it is applied there.",
            )

    val getter =
        runCatching { task.javaClass.getMethod(getterName) }.getOrElse {
            throw GradleException(
                "brownfield: task '$taskName' (${task.javaClass.name}) does not expose " +
                    "'$getterName()'. The plugin that registers it most likely changed its " +
                    "API; the brownfield Gradle plugin needs updating to match.",
                it,
            )
        }

    check(DirectoryProperty::class.java.isAssignableFrom(getter.returnType)) {
        "brownfield: '$taskName.$getterName()' no longer returns a DirectoryProperty."
    }
    return getter
}
