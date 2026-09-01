package com.callstack.brownfield.android.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import androidx.compose.ui.text.style.TextAlign
import com.callstack.brownfield.android.example.E2eTestIds
import androidx.compose.ui.unit.dp
import com.callstack.brownfield.android.example.components.EspressoTagAnchor
import com.callstack.brownfield.android.example.ui.theme.AndroidBrownfieldAppTheme

class SettingsActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            AndroidBrownfieldAppTheme {
                Scaffold(
                    modifier = Modifier
                        .fillMaxSize()
                        .semantics { testTagsAsResourceId = true },
                ) { innerPadding ->
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                            .padding(24.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        EspressoTagAnchor(
                            tag = E2eTestIds.nativeAppNativeSettings,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                text = "Settings",
                                style = MaterialTheme.typography.headlineMedium,
                            )
                        }
                        Text(
                            text = "Opened from BrownfieldNavigation.navigateToSettings().",
                            textAlign = TextAlign.Center
                        )
                        Button(onClick = { finish() }) {
                            Text("Go back")
                        }
                    }
                }
            }
        }
    }
}
