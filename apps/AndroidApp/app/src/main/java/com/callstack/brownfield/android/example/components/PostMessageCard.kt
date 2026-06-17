package com.callstack.brownfield.android.example.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.callstack.brownfield.android.example.E2eTestIds
import com.callstack.reactnativebrownfield.OnMessageListener
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import org.json.JSONObject

@Composable
fun PostMessageCard(
    onMessageReceived: (String) -> Unit = {},
) {
    var nextId by remember { mutableIntStateOf(0) }
    var draft by remember { mutableStateOf("") }

    DisposableEffect(Unit) {
        val listener = OnMessageListener { raw ->
            val text = try {
                JSONObject(raw).optString("text", raw)
            } catch (_: Exception) {
                raw
            }
            onMessageReceived("Received message from React Native: $text")
        }
        ReactNativeBrownfield.shared.addMessageListener(listener)
        onDispose { ReactNativeBrownfield.shared.removeMessageListener(listener) }
    }

    MaterialCard {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                "postMessage",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier
                    .padding(bottom = 2.dp)
                    .align(Alignment.CenterHorizontally),
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {

                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Type a message...") },
                    singleLine = true,
                )
                Button(
                    onClick = {
                        val text = draft.ifBlank { "Hello from Android! (#${nextId++})" }
                        val json = JSONObject().put("text", text).toString()
                        ReactNativeBrownfield.shared.postMessage(json)
                        draft = ""
                    },
                    modifier = Modifier.testTag(E2eTestIds.nativeAppPostMessageSend),
                ) {
                    EspressoTagAnchor(E2eTestIds.nativeAppPostMessageSend)
                    Text("Send")
                }
            }
        }
    }
}
