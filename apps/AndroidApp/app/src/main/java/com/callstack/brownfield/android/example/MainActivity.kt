package com.callstack.brownfield.android.example

import com.callstack.brownie.registerStoreIfNeeded
import android.app.Activity
import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.fragment.compose.AndroidFragment
import com.callstack.brownfield.android.example.components.GreetingCard
import com.callstack.brownfield.android.example.components.PostMessageCard
import com.callstack.brownfield.android.example.components.PostMessageToast
import com.callstack.brownfield.android.example.ui.theme.AndroidBrownfieldAppTheme
import com.callstack.nativebrownfieldnavigation.BrownfieldNavigationDelegate
import com.callstack.nativebrownfieldnavigation.BrownfieldNavigationManager
import com.callstack.nativebrownfieldnavigation.UserType
import com.callstack.reactnativebrownfield.ReactNativeFragment
import com.callstack.reactnativebrownfield.constants.ReactNativeFragmentArgNames
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.Promise

class MainActivity : AppCompatActivity(), BrownfieldNavigationDelegate {
    private val isDetoxE2E: Boolean
        get() = intent?.getStringExtra("DetoxE2E") == "YES"

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)

        ReactNativeHostManager.onConfigurationChanged(application, newConfig)
    }

    override fun onResume() {
        super.onResume()
        BrownfieldNavigationManager.setDelegate(this)
        if (isDetoxE2E) {
            window.decorView.post { window.decorView.requestFocus() }
        }
    }

    override fun onPause() {
        BrownfieldNavigationManager.clearDelegate()
        super.onPause()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus && isDetoxE2E) {
            window.decorView.post { window.decorView.requestFocus() }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
        enableEdgeToEdge()

        if (savedInstanceState == null) {
            ReactNativeHostManager.initialize(application) {
                if (!isDetoxE2E) {
                    Toast.makeText(
                        this,
                        "React Native has been loaded",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }

            registerStoreIfNeeded(
                storeName = BrownfieldStore.STORE_NAME
            ) {
                BrownfieldStore(
                    counter = 0.0,
                    user = User(name = "Username")
                )
            }
        }

        setContent {
            AndroidBrownfieldAppTheme {
                Scaffold(
                    modifier = Modifier
                        .fillMaxSize()
                        .semantics { testTagsAsResourceId = true },
                ) { innerPadding ->
                    MainScreen(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                            .padding(16.dp)
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
}

@Composable
private fun MainScreen(modifier: Modifier = Modifier) {
    var postMessageToastText by remember { mutableStateOf<String?>(null) }
    val activity = LocalContext.current as? Activity
    val isDetoxE2E = remember(activity) {
        activity?.intent?.getStringExtra("DetoxE2E") == "YES"
    }

    Box(modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(3.dp))

            GreetingCard(
                name = ReactNativeConstants.APP_NAME,
            )

            PostMessageCard(
                onMessageReceived = { message -> postMessageToastText = message },
                textInputEnabled = !isDetoxE2E,
            )

            Spacer(modifier = Modifier.height(1.dp))

            ReactNativeView(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(520.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(MaterialTheme.colorScheme.surface)
            )
        }

        postMessageToastText?.let { message ->
            PostMessageToast(
                message = message,
                onDismiss = { postMessageToastText = null },
            )
        }
    }
}

@Composable
fun ReactNativeView(
    modifier: Modifier = Modifier
) {
    val activity = LocalContext.current as? Activity
    val brownfieldE2E = remember(activity) {
        activity?.intent?.getStringExtra("DetoxE2E") == "YES"
    }

    AndroidFragment<ReactNativeFragment>(
        modifier = modifier,
        arguments = Bundle().apply {
            putString(
                ReactNativeFragmentArgNames.ARG_MODULE_NAME,
                ReactNativeConstants.MAIN_MODULE_NAME
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
    )
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    AndroidBrownfieldAppTheme {
        MainScreen()
    }
}
