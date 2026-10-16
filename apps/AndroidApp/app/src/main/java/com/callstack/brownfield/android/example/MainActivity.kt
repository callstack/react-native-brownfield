package com.callstack.brownfield.android.example

import android.app.Activity
import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.callstack.brownfield.android.example.components.EspressoTagAnchor
import com.callstack.brownfield.android.example.components.GreetingCard
import com.callstack.brownfield.android.example.components.PostMessageCard
import com.callstack.brownfield.android.example.components.PostMessageToast
import com.callstack.brownfield.android.example.ui.theme.AndroidBrownfieldAppTheme

class MainActivity : AppCompatActivity() {
    private val isDetoxE2E: Boolean
        get() = intent?.getStringExtra("DetoxE2E") == "YES"

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)

        ReactNativeHostManager.onConfigurationChanged(application, newConfig)
    }

    override fun onResume() {
        super.onResume()
        if (isDetoxE2E) {
            window.decorView.post { window.decorView.requestFocus() }
        }
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
            ReactNativeHostManager.initialize(application) { _ ->
                if (!isDetoxE2E) {
                    Toast.makeText(
                        this,
                        "React Native has been loaded",
                        Toast.LENGTH_LONG
                    ).show()
                }
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

            EspressoTagAnchor(tag = E2eTestIds.nativeAppOpenReactNative) {
                Button(
                    onClick = {
                        activity?.let {
                            it.startActivity(
                                Intent(it, ReactNativeActivity::class.java)
                                    // Forward the Detox flag so the RN host keeps E2E behaviour.
                                    .putExtra("DetoxE2E", it.intent?.getStringExtra("DetoxE2E"))
                            )
                        }
                    }
                ) {
                    Text("Open React Native")
                }
            }

            PostMessageCard(
                onMessageReceived = { message -> postMessageToastText = message },
                textInputEnabled = !isDetoxE2E,
            )

            Spacer(modifier = Modifier.height(16.dp))
        }

        postMessageToastText?.let { message ->
            PostMessageToast(
                message = message,
                onDismiss = { postMessageToastText = null },
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    AndroidBrownfieldAppTheme {
        MainScreen()
    }
}
