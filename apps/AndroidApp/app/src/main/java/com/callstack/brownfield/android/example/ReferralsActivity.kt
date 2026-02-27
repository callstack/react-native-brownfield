package com.callstack.brownfield.android.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.callstack.brownfield.android.example.ui.theme.AndroidBrownfieldAppTheme

class ReferralsActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val userId = intent.getStringExtra(EXTRA_USER_ID).orEmpty()

        setContent {
            AndroidBrownfieldAppTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                            .padding(24.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "Referrals",
                            style = MaterialTheme.typography.headlineMedium
                        )
                        Text(
                            text = "Opened from BrownfieldNavigation.navigateToReferrals(userId).",
                            textAlign = TextAlign.Center
                        )
                        Text(
                            text = "userId: $userId",
                            style = MaterialTheme.typography.bodyLarge
                        )
                        Button(onClick = { finish() }) {
                            Text("Go back")
                        }
                    }
                }
            }
        }
    }

    companion object {
        const val EXTRA_USER_ID = "extra_user_id"
    }
}
