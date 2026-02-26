package com.callstack.brownfield.android.example.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.callstack.brownie.Store
import com.callstack.brownie.StoreManager
import com.callstack.brownie.store
import com.rnapp.brownfieldlib.BrownfieldStore
import com.callstack.brownie.subscribe

private fun brownieStore(): Store<BrownfieldStore>? {
    return StoreManager.shared.store(BrownfieldStore.STORE_NAME)
}

@Composable
fun GreetingCard(
    name: String,
) {
    var counter by remember { mutableIntStateOf(0) }

    DisposableEffect(Unit) {
        val store = brownieStore()
        val unsubscribe = store?.subscribe(
            selector = { state -> state.counter.toInt() },
            onChange = { updatedCounter -> counter = updatedCounter }
        ) ?: {}

        onDispose {
            unsubscribe()
        }
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
                text = "Hello native $name 👋",
                style = MaterialTheme.typography.titleMedium,
                textAlign = TextAlign.Center
            )

            Text(
                text = "You clicked the button $counter time${if (counter == 1) "" else "s"}",
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.bodyMedium
            )

            Button(onClick = {
                brownieStore()?.set { state ->
                    state.copy(counter = state.counter + 1)
                }
            }) {
                Text("Increment counter")
            }
        }
    }
}