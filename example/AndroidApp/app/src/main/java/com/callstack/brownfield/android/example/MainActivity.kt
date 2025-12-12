package com.callstack.brownfield.android.example

import android.os.Bundle
import android.widget.Toast
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.fragment.compose.AndroidFragment
import com.callstack.brownfield.android.example.ui.theme.AndroidBrownfieldAppTheme
import com.callstack.reactnativebrownfield.ReactNativeFragment
import com.callstack.reactnativebrownfield.constants.ReactNativeFragmentArgNames
import com.rnapp.brownfieldlib.ReactNativeHostManager

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        ReactNativeHostManager.initialize(this.application) {
            Toast.makeText(this, "React Native has been loaded", Toast.LENGTH_LONG).show()
        }

        setContent {
            AndroidBrownfieldAppTheme {
                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    Column(modifier = Modifier.padding(innerPadding)) {
                        Greeting(
                            name = "Android",
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(innerPadding)
                                .padding(vertical = 1.dp),
                        )

                        ReactNativeView()
                    }
                }
            }
        }
    }
}

@Composable
fun Greeting(name: String, modifier: Modifier = Modifier) {
    var counter by remember { mutableStateOf(0) }

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Hello $name, you clicked the button $counter time${if (counter == 1) "" else "s"}!",
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
        )

        Button(
            onClick = { counter++ },
        ) {
            Text(text = "Increment counter")
        }
    }
}

@Composable
fun ReactNativeView() {
    AndroidFragment<ReactNativeFragment>(
        arguments = Bundle().apply {
            putString(ReactNativeFragmentArgNames.ARG_MODULE_NAME, "RNApp")
        }, modifier = Modifier
            .fillMaxSize()
    )
}

@Preview(showBackground = true)
@Composable
fun GreetingPreview() {
    AndroidBrownfieldAppTheme {
        Greeting("Android")
    }
}
