package com.callstack.kotlinexample

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.FragmentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.callstack.reactnativebrownfield.ReactNativeBrownfield

class MainActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    setContent {
      MaterialTheme {
        Surface(
          modifier = Modifier.fillMaxSize()
        ) {
          // Set up the NavHost for navigation
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
  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(16.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.Center
  ) {
    Text(
      "React Native Brownfield Example",
      fontSize = 30.sp,
      modifier = Modifier.padding(15.dp),
      textAlign = TextAlign.Center
    )

    Button(
      onClick = onStartReactNativeFragment,
      modifier = Modifier
        .fillMaxWidth()
        .padding(vertical = 8.dp)
    ) {
      Text("Navigate to React Native Fragment with Compose")
    }

    Button(
      onClick = {
        onStartReactNativeFragmentActivity()
      }
    ) {
      Text("Navigate to React Native Fragment Activity")
    }
  }
}

@Composable
fun ReactNativeScreen() {
  Box(modifier = Modifier.fillMaxSize()) {
    val fragmentManager = LocalContext.current as FragmentActivity

    AndroidView(
      factory = { context ->
        ReactNativeBrownfield.shared.createView(context, fragmentManager, "ReactNative")
      },
      modifier = Modifier.fillMaxSize()
    )
  }
}
