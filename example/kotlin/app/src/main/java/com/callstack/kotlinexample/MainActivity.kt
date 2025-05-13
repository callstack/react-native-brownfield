package com.callstack.kotlinexample

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.FragmentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.ActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler

class MainActivity : AppCompatActivity(), DefaultHardwareBackBtnHandler {
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

  override fun invokeDefaultOnBackPressed() {
    super.onBackPressed()
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
  val context = LocalContext.current
  val launcher = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.StartActivityForResult(),
    onResult = { result ->
      val message = if (result.resultCode == Activity.RESULT_OK) {
        "Result: ${result.data?.getExtras()?.get("result")}"
      } else {
        "Activity cancelled or failed. ${result.resultCode}"
      }
      AlertDialog.Builder(context)
        .setTitle("Activity Result")
        .setMessage(message)
        .setPositiveButton("OK") { dialog, _ ->
          dialog.dismiss()
        }
        .show()
    }
  )
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

    Button(
      onClick = {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
          setClass(context, ReactNativeFragmentActivity::class.java)
        }
        launcher.launch(intent)
      }
    ) {
      Text("Navigate to React Native Fragment Activity with Result")
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
