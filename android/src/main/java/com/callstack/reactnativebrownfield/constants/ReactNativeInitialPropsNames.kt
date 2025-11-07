package com.callstack.reactnativebrownfield.constants

import com.facebook.react.ReactFragment

/**
 * Convenience export of arguments that can be used
 */
class ReactNativeInitialPropsNames private constructor() :
    ReactFragment() // subclass to gain access to protected constants
{
    companion object {
        /**
         * The module name to be loaded
         */
        const val ARG_MODULE_NAME = "arg_module_name"

        // re-export constants from ReactFragment to enable access
        const val ARG_LAUNCH_OPTIONS: String = "arg_launch_options"
    }
}
