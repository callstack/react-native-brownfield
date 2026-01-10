package com.callstack.react.brownfield.utils

open class Extension {
    companion object {
        const val NAME = "reactBrownfield"
    }

    /**
     * Whether to resolve transitive dependencies.
     * If false, only embed dependency
     * If true, embed remote library's dependencies and local jar module
     *
     * Default value is false
     */
    var transitive = false

    /**
     * Should the plugin embed the local project dependencies.
     * For eg, local modules
     *
     * Default value is true
     */
    var resolveLocalDependencies = true

    /**
     * Name of the module using `com.android.application`
     * For eg, app
     *
     * Default value is `app`
     */
    var appProjectName = "app"

    /**
     * Sets whether the consumer project is based on Expo.
     *
     * Default value is `false`
     */
    var isExpo = false

    /**
     * List of dynamic libs (.so) files that you wish to bundle with
     * the aar.
     *
     * By default only `libappmodules.so` and `libreact_codegen_*.so` are
     * bundled.
     */
    var dynamicLibs = listOf<String>()

    /**
     * Whether to use stripped .so files.
     *
     * Default value is `false`
     */
    var experimentalUseStrippedSoFiles = false
}
