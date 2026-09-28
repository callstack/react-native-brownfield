package com.callstack.brownfield.android.example.components

import android.view.View
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.viewinterop.AndroidView

/**
 * Bridges Compose-hosted UI to Detox/Espresso [by.id] matchers.
 *
 * Compose [androidx.compose.ui.platform.testTag] is visible to UiAutomator via
 * [androidx.compose.ui.semantics.testTagsAsResourceId], but Detox resolves ids through
 * Espresso [View.getTag]. The backing [AndroidView] uses [Modifier.matchParentSize] so the
 * tagged view inherits the visible bounds of [content] — a 1dp anchor fails Detox
 * [toBeVisible] even when the on-screen text is shown.
 */
@Composable
fun EspressoTagAnchor(
    tag: String,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit = {},
) {
    Box(modifier = modifier) {
        AndroidView(
            modifier = Modifier
                .matchParentSize()
                .testTag(tag),
            factory = { context ->
                View(context).apply {
                    this.tag = tag
                    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
                }
            },
            update = { view ->
                view.tag = tag
            },
        )
        content()
    }
}
