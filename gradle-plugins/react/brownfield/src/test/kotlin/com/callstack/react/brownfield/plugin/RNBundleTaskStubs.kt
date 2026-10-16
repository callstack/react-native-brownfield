package com.callstack.react.brownfield.plugin

import java.io.File

internal const val RN_BUNDLE_TASK_STUBS_SCRIPT = "rn-bundle-task-stubs.gradle.kts"

/**
 * Writes a script plugin into [appDir] that stubs RNGP's `createBundle<Variant>JsAndAssets` tasks.
 * The brownfield plugin wires their `jsBundleDir`/`resourcesDir` outputs as generated sources and
 * fails fast when they are missing, so plain `tasks.register(name)` stubs are not enough.
 * Apply it from the app build script with `apply(from = RN_BUNDLE_TASK_STUBS_SCRIPT)`.
 */
internal fun writeRNBundleTaskStubs(appDir: File) {
    File(appDir, RN_BUNDLE_TASK_STUBS_SCRIPT).writeText(
        """
        abstract class StubBundleTask : DefaultTask() {
            @get:OutputDirectory abstract val jsBundleDir: DirectoryProperty
            @get:OutputDirectory abstract val resourcesDir: DirectoryProperty
        }

        listOf(
            "createBundleDebugJsAndAssets",
            "createBundleReleaseJsAndAssets",
        ).forEach { name -> tasks.register<StubBundleTask>(name) }
        """.trimIndent(),
    )
}
