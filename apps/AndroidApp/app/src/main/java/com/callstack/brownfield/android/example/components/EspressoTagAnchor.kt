package com.callstack.brownfield.android.example.components

import android.view.View
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView

/**
 * Invisible anchor view so Detox/Espresso [by.id] can match Compose-hosted screens.
 *
 * Compose [androidx.compose.ui.platform.testTag] is visible to UiAutomator via
 * [androidx.compose.ui.semantics.testTagsAsResourceId], but Detox resolves ids through
 * Espresso [View.getTag]. This anchor bridges the two.
 */
@Composable
fun EspressoTagAnchor(
    tag: String,
    modifier: Modifier = Modifier,
) {
    AndroidView(
        modifier = modifier
            .size(1.dp)
            .testTag(tag),
        factory = { context ->
            View(context).apply {
                this.tag = tag
                importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
            }
        },
    )
}
