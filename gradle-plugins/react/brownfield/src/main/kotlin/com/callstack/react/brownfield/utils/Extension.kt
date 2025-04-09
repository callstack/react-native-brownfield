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
}
