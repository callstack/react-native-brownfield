package com.callstack.reactnativebrownfield

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.callstack.reactnativebrownfield.constants.ReactNativeFragmentArgNames
import com.facebook.react.ReactFragment
import com.facebook.react.ReactHost
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener

class ReactNativeFragment : ReactFragment(), PermissionAwareActivity {
    private lateinit var permissionsCallback: Callback
    private var permissionListener: PermissionListener? = null
    private lateinit var moduleName: String

    override fun onCreate(savedInstanceState: Bundle?) {
        /**
         * ReactFragment.onCreate will throw an exception if we do not provide arg_component_name as arguments.
         * We silently catch this exception. The reason is we want to invoke the super<Fragment>.onCreate in
         * ReactFragment. Then initialise the mReactDelegate with ReactDelegateWrapper instead of ReactDelegate.
         *
         * So we purposely force ReactFragment.onCreate to throw an exception, so that we can provide our own
         * implementation for mReactDelegate: ReactDelegateWrapper
         */
        try {
            super.onCreate(savedInstanceState)
        } catch (e: IllegalStateException) {
            Log.w(
                "ReactNativeFragment",
                "ReactFragment threw due to missing arg_component_name: ${e.message} - This is an expected behaviour."
            )
        }

        moduleName = arguments?.getString(ReactNativeFragmentArgNames.ARG_MODULE_NAME)!!
        this.reactDelegate =
            ReactDelegateWrapper(
                activity,
                this.reactHost,
                moduleName,
                arguments?.getBundle(ReactNativeFragmentArgNames.ARG_LAUNCH_OPTIONS)
            )
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        return ReactNativeBrownfield.shared.createView(
            activity,
            moduleName,
            this.reactDelegate as ReactDelegateWrapper
        )
    }

    override val reactHost: ReactHost?
        get() = ReactNativeBrownfield.shared.reactHost

    override fun onResume() {
        try {
            super.onResume()
        } catch (_: ClassCastException) {
            (this.reactDelegate as ReactDelegateWrapper).onReactHostResume()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        permissionsCallback = Callback {
            if (permissionListener != null) {
                permissionListener?.onRequestPermissionsResult(
                    requestCode,
                    permissions,
                    grantResults
                )

                permissionListener = null
            }
        }
    }

    override fun checkPermission(permission: String, pid: Int, uid: Int): Int {
        return requireActivity().checkPermission(permission, pid, uid)
    }

    override fun checkSelfPermission(permission: String): Int {
        return requireActivity().checkSelfPermission(permission)
    }

    override fun requestPermissions(
        permissions: Array<String>,
        requestCode: Int,
        listener: PermissionListener?
    ) {
        permissionListener = listener
        this.requestPermissions(permissions, requestCode)
    }

    companion object {
        @JvmStatic
        @JvmOverloads
        fun createReactNativeFragment(
            moduleName: String,
            initialProps: Bundle? = null
        ): ReactNativeFragment {
            val fragment = ReactNativeFragment()
            val args = Bundle()
            args.putString(ReactNativeFragmentArgNames.ARG_MODULE_NAME, moduleName)
            if (initialProps != null) {
                args.putBundle(ReactNativeFragmentArgNames.ARG_LAUNCH_OPTIONS, initialProps)
            }
            fragment.arguments = args
            return fragment
        }

        @JvmStatic
        fun createReactNativeFragment(
            moduleName: String,
            initialProps: HashMap<String, *>
        ): ReactNativeFragment {
            return createReactNativeFragment(moduleName, PropsBundle.fromHashMap(initialProps))
        }

        @JvmStatic
        fun createReactNativeFragment(
            moduleName: String,
            initialProps: WritableMap
        ): ReactNativeFragment {
            return createReactNativeFragment(moduleName, initialProps.toHashMap())
        }
    }
}
