package com.callstack.react.brownfield.utils

open class Extension {
    companion object {
        const val NAME = "reactBrownfield"
    }

    /**
     * Name of the module using `com.android.application`
     * For eg, app
     *
     * Default value is `app`
     */
    var appProjectName = "app"

    /**
     * Whether to use stripped .so files.
     *
     * Default is `true`.
     */
    var useStrippedSoFiles = true

    @Deprecated(
        message =
            "This property is deprecated and will be removed in a future release." +
                "The successor is useStrippedSoFiles, which is by default true.",
        replaceWith = ReplaceWith("useStrippedSoFiles"),
        level = DeprecationLevel.WARNING,
    )
    var experimentalUseStrippedSoFiles
        get() = useStrippedSoFiles
        set(value) {
            useStrippedSoFiles = value
        }

    /**
     * List of missing dimension strategies.
     *
     * Provide in this format:
     * listOf("type", "alpha")
     */
    var missingDimensionStrategies = listOf<String>()

    /**
     * Additional .so file names to keep out of the AAR, on top of
     * [com.callstack.react.brownfield.processors.IGNORE_EMBEDDED_LIBS].
     *
     * Use this for libraries that stay declared as dependencies of the published AAR: the
     * host App resolves those from Maven, so embedding them as well leaves two copies of
     * the same .so and the host's native library merge fails.
     *
     * Provide in this format:
     * listOf("libdatadog-ndk.so")
     */
    var ignoreEmbeddedLibs = listOf<String>()
}
