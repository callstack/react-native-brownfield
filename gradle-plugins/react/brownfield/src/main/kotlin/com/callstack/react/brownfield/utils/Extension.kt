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
}
