package com.callstack.kotlinexample

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.FragmentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.callstack.reactnativebrownfield.OnMessageListener
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import org.json.JSONObject

data class ChatMessage(val id: Int, val text: String, val fromRN: Boolean)

class MainActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    setContent {
      MaterialTheme {
        Surface(
          modifier = Modifier.fillMaxSize()
        ) {
          val navController = rememberNavController()

          NavHost(
            navController = navController,
            startDestination = "home",
          ) {
            composable("home") {
              HomeScreen(
                onStartReactNativeFragment = {
                  navController.navigate("reactNative")
                },
                onStartReactNativeFragmentActivity = {
                  startReactNativeFragment()
                }
              )
            }

            composable("reactNative") {
              ReactNativeScreen()
            }
          }
        }
      }
    }
  }

  fun startReactNativeFragment() {
    val intent = Intent(this, ReactNativeFragmentActivity::class.java)
    startActivity(intent)
    overridePendingTransition(R.anim.slide_fade_in, android.R.anim.fade_out)
  }
}

@Composable
fun HomeScreen(
  onStartReactNativeFragment: () -> Unit,
  onStartReactNativeFragmentActivity: () -> Unit
) {
  val messages = remember { mutableStateListOf<ChatMessage>() }
  var nextId by remember { mutableIntStateOf(0) }
  var draft by remember { mutableStateOf("") }

  DisposableEffect(Unit) {
    val listener = OnMessageListener { raw ->
      val text = try {
        JSONObject(raw).optString("text", raw)
      } catch (_: Exception) { raw }
      messages.add(ChatMessage(nextId++, text, fromRN = true))
      // Scroll to bottom when a new message is added
      // This requires a LazyListState, but since LazyColumn is a child,
      // we can't directly control its scroll state here. This is a limitation of current Compose setup.
      // For now, we will just add the message to the end.
    }
    ReactNativeBrownfield.shared.addMessageListener(listener)
    onDispose { ReactNativeBrownfield.shared.removeMessageListener(listener) }
  }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(16.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
  ) {
    Text(
      "React Native Brownfield Example",
      fontSize = 24.sp,
      modifier = Modifier.padding(bottom = 12.dp),
      textAlign = TextAlign.Center
    )

    Button(
      onClick = onStartReactNativeFragment,
      modifier = Modifier
        .fillMaxWidth()
        .padding(vertical = 4.dp)
    ) {
      Text("Navigate to React Native Fragment with Compose")
    }

    Button(
      onClick = onStartReactNativeFragmentActivity,
      modifier = Modifier.padding(bottom = 12.dp)
    ) {
      Text("Navigate to React Native Fragment Activity")
    }

    Text(
      "postMessage",
      style = MaterialTheme.typography.titleMedium,
      modifier = Modifier.padding(bottom = 8.dp)
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
      Button(onClick = {
        val text = draft.ifBlank { "Hello from Kotlin! (#$nextId)" }
        val json = JSONObject().put("text", text).toString()
        ReactNativeBrownfield.shared.postMessage(json)
        messages.add(ChatMessage(nextId++, text, fromRN = false))
        // Scroll to bottom when a new message is added
        // This requires a LazyListState, but since LazyColumn is a child,
        // we can't directly control its scroll state here. This is a limitation of current Compose setup.
        // For now, we will just add the message to the end.
        draft = ""
      }) {
        Text("Send")
      }
    }

    Spacer(modifier = Modifier.height(8.dp))

        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            reverseLayout = false // Newest on bottom
        ) {
      items(messages, key = { it.id }) { msg ->
        AnimatedVisibility(
          visible = true,
          enter = slideInVertically(initialOffsetY = { it }) + fadeIn()
        ) {
          val shape = RoundedCornerShape(12.dp)
          val bgColor = if (msg.fromRN)
            MaterialTheme.colorScheme.primaryContainer
          else
            MaterialTheme.colorScheme.tertiaryContainer

          Column(
            modifier = Modifier
              .let { if (msg.fromRN) it.fillMaxWidth(0.85f) else it.fillMaxWidth(0.85f) }
              .then(
                if (msg.fromRN) Modifier else Modifier.align(Alignment.End)
              )
              .clip(shape)
              .background(bgColor)
              .border(1.dp, bgColor.copy(alpha = 0.6f), shape)
              .padding(10.dp)
          ) {
            Text(
              if (msg.fromRN) "From React Native" else "Sent",
              style = MaterialTheme.typography.labelSmall,
              color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(msg.text, style = MaterialTheme.typography.bodyMedium)
          }
        }
      }
    }
  }
}

@Composable
fun ReactNativeScreen() {
  Box(modifier = Modifier.fillMaxSize()) {
    val fragmentManager = LocalContext.current as FragmentActivity

    AndroidView(
      factory = { context ->
        ReactNativeBrownfield.shared.createView(fragmentManager, "ReactNative")
      },
      modifier = Modifier.fillMaxSize()
    )
  }
}
