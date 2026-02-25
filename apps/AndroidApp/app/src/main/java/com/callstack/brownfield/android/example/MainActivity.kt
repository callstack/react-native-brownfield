package com.callstack.brownfield.android.example

import android.content.Intent
import android.content.res.Configuration
import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.fragment.compose.AndroidFragment
import com.callstack.brownfield.android.example.components.GreetingCard
import com.callstack.brownfield.android.example.components.PostMessageCard
import com.callstack.brownfield.android.example.ui.theme.AndroidBrownfieldAppTheme
import com.callstack.nativebrownfieldnavigation.BrownfieldNavigationDelegate
import com.callstack.nativebrownfieldnavigation.BrownfieldNavigationManager
import com.callstack.reactnativebrownfield.ReactNativeFragment
import com.callstack.reactnativebrownfield.constants.ReactNativeFragmentArgNames

class MainActivity : AppCompatActivity(), BrownfieldNavigationDelegate {
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)

        ReactNativeHostManager.onConfigurationChanged(application, newConfig)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
        enableEdgeToEdge()
        BrownfieldNavigationManager.setDelegate(this)

        if (savedInstanceState == null) {
            ReactNativeHostManager.initialize(application) {
                Toast.makeText(
                    this,
                    "React Native has been loaded",
                    Toast.LENGTH_LONG
                ).show()
            }
        }

        setContent {
            AndroidBrownfieldAppTheme {
                Scaffold(
                    modifier = Modifier.fillMaxSize()
                ) { innerPadding ->
                    MainScreen(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                            .padding(16.dp) // outer margin
                    )
                }
            }
        }
    }

    override fun navigateToSettings() {
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
}

@Composable
private fun MainScreen(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally // center top bar content
    ) {
        GreetingCard(
            name = ReactNativeConstants.APP_NAME,
        )

        PostMessageCard()

        Spacer(modifier = Modifier.height(1.dp))

        ReactNativeView(
            modifier = Modifier
                .fillMaxSize()
                .clip(RoundedCornerShape(16.dp))
                .background(MaterialTheme.colorScheme.surface)
        )
    }
}

@Composable
fun ReactNativeView(
    modifier: Modifier = Modifier
) {
    AndroidFragment<ReactNativeFragment>(
        modifier = modifier,
        arguments = Bundle().apply {
            putString(
                ReactNativeFragmentArgNames.ARG_MODULE_NAME,
                ReactNativeConstants.MAIN_MODULE_NAME
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
