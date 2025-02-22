package com.callstack.rnbrownfield.utils

open class Extension {
    companion object {
        const val NAME = "rnbrownfield"
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
     * Default value is false
     */
    var resolveLocalDependencies = false
}
