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
     * Whether to take the .so files from the app module's stripped or unstripped native output. It
     * does not change which .so files are embedded. AGP still strips the AAR's native libs when it
     * packages the library.
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

    /**
     * Exact .so file names, taken from the app module's native output, to embed in the AAR on top
     * of the app's own libs and the embedded libraries' libs. Use it for a .so the host app cannot
     * get any other way: one the app module builds or ships itself, or one from a dependency the
     * published AAR does not declare.
     *
     * Provide in this format:
     * listOf("libmmkv.so")
     */
    var dynamicLibs = listOf<String>()

    /**
     * Whether to publish embedded native modules' third-party dependencies into the generated POM
     * and Gradle Module Metadata, so consuming apps resolve them instead of declaring them by hand.
     *
     * Experimental; behavior may still change. On Expo projects, Expo modules' dependencies are
     * published regardless; this covers the other native modules. Set to `false` to hand-declare them instead.
     *
     * Default is `true`.
     */
    var experimentalIncludeTransitiveDependencies = true
}
