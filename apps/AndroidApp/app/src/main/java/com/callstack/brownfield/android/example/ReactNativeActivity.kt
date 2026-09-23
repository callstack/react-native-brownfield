package com.callstack.brownfield.android.example

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.unit.dp
import androidx.fragment.compose.AndroidFragment
import com.callstack.brownfield.android.example.ui.theme.AndroidBrownfieldAppTheme
import com.callstack.nativebrownfieldnavigation.BrownfieldNavigationDelegate
import com.callstack.nativebrownfieldnavigation.BrownfieldNavigationManager
import com.callstack.nativebrownfieldnavigation.UserType
import com.callstack.reactnativebrownfield.ReactNativeFragment
import com.callstack.reactnativebrownfield.constants.ReactNativeFragmentArgNames
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.Promise

/**
 * React Native hosted in its own activity instead of being embedded inline in
 * [MainActivity]. The native shell stays in the task stack, so Back returns to it, while the
 * React Native JavaScript stack still pops its own screens first.
 */
class ReactNativeActivity : AppCompatActivity(), BrownfieldNavigationDelegate {
    private val isDetoxE2E: Boolean
        get() = intent?.getStringExtra(EXTRA_DETOX_E2E) == "YES"

    private val moduleName: String
        get() = intent?.getStringExtra(EXTRA_MODULE_NAME)
            ?: ReactNativeConstants.MAIN_MODULE_NAME

    override fun onResume() {
        super.onResume()
        // Own Brownfield navigation while foregrounded. MainActivity is stopped rather than
        // destroyed underneath us, so it reclaims the delegate when it resumes.
        BrownfieldNavigationManager.setDelegate(this)
    }

    override fun onPause() {
        // Release ownership before another host can become the active delegate.
        BrownfieldNavigationManager.clearDelegate()
        super.onPause()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
        enableEdgeToEdge()

        setContent {
            AndroidBrownfieldAppTheme {
                Scaffold(
                    modifier = Modifier
                        .fillMaxSize()
                        .semantics { testTagsAsResourceId = true },
                ) { innerPadding ->
                    ReactNativeFragmentContainer(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding),
                        moduleName = moduleName,
                        brownfieldE2E = isDetoxE2E,
                    )
                }
            }
        }
    }

    override fun navigateToSettings(user: UserType) {
        startActivity(Intent(this, SettingsActivity::class.java))
    }

    override fun navigateToReferrals(userId: String) {
        startActivity(
            Intent(this, ReferralsActivity::class.java).putExtra(
                ReferralsActivity.EXTRA_USER_ID,
                userId
            )
        )
    }

    override fun requestNativeConfirmation(title: String, promise: Promise) {
        runOnUiThread {
            AlertDialog.Builder(this)
                .setTitle(title)
                .setPositiveButton("OK") { _, _ -> promise.resolve(true) }
                .setNegativeButton("Cancel") { _, _ -> promise.resolve(false) }
                .setCancelable(false)
                .show()
        }
    }

    override fun showNativeBanner(message: String, onDismiss: Callback) {
        runOnUiThread {
            AlertDialog.Builder(this)
                .setMessage(message)
                .setPositiveButton("Dismiss") { _, _ -> onDismiss.invoke() }
                .setCancelable(false)
                .show()
        }
    }

    companion object {
        const val EXTRA_DETOX_E2E = "DetoxE2E"
        const val EXTRA_MODULE_NAME = "extra_module_name"

        fun createIntent(
            context: Context,
            detoxE2E: Boolean,
            moduleName: String = ReactNativeConstants.MAIN_MODULE_NAME,
        ): Intent =
            Intent(context, ReactNativeActivity::class.java)
                .putExtra(EXTRA_MODULE_NAME, moduleName)
                .putExtra(EXTRA_DETOX_E2E, if (detoxE2E) "YES" else "NO")
    }
}

@Composable
fun ReactNativeFragmentContainer(
    modifier: Modifier = Modifier,
    moduleName: String = ReactNativeConstants.MAIN_MODULE_NAME,
    brownfieldE2E: Boolean = false,
) {
    AndroidFragment<ReactNativeFragment>(
        modifier = modifier,
        arguments = remember(moduleName, brownfieldE2E) {
            Bundle().apply {
                putString(
                    ReactNativeFragmentArgNames.ARG_MODULE_NAME,
                    moduleName
                )
                putBundle(
                    ReactNativeFragmentArgNames.ARG_LAUNCH_OPTIONS,
                    Bundle().apply {
                        putString(
                            "nativeOsVersionLabel",
                            "Android ${Build.VERSION.RELEASE}"
                        )
                        putBoolean("brownfieldE2E", brownfieldE2E)
                    }
                )
            }
        }
    )
}
