package com.callstack.brownfield.android.example.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.callstack.brownfield.android.example.E2eTestIds
import kotlinx.coroutines.delay

@Composable
fun PostMessageToast(
    message: String,
    onDismiss: () -> Unit,
) {
    var visible by remember(message) { mutableStateOf(true) }
    var scale by remember(message) { mutableFloatStateOf(0.5f) }
    var opacity by remember(message) { mutableFloatStateOf(0f) }

    val animatedScale by animateFloatAsState(scale, label = "toastScale")
    val animatedOpacity by animateFloatAsState(opacity, label = "toastOpacity")

    LaunchedEffect(message) {
        scale = 1f
        opacity = 1f
        delay(2000)
        scale = 0.5f
        opacity = 0f
        delay(300)
        visible = false
        onDismiss()
    }

    if (visible) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.BottomCenter,
        ) {
            Text(
                text = message,
                color = Color.White,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .padding(horizontal = 20.dp, vertical = 12.dp)
                    .padding(bottom = 50.dp)
                    .scale(animatedScale)
                    .alpha(animatedOpacity)
                    .background(Color.Black.copy(alpha = 0.8f), RoundedCornerShape(25.dp))
                    .testTag(E2eTestIds.nativeAppPostMessageToast),
            )
            EspressoTagAnchor(E2eTestIds.nativeAppPostMessageToast)
        }
    }
}
