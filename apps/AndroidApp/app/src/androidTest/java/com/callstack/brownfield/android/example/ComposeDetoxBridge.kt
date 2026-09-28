package com.callstack.brownfield.android.example

import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.test.rule.ActivityTestRule
import org.junit.rules.RuleChain
import org.junit.rules.TestRule

/**
 * Connects Jetpack Compose semantics to Espresso's idling/sync layer so Detox can
 * interact with the native Compose shell while RN runs in [ReactNativeFragment].
 *
 * Uses [createEmptyComposeRule] because [MainActivity] already hosts Compose content;
 * Detox owns activity launch via [ActivityTestRule].
 */
object ComposeDetoxBridge {
    fun emptyComposeRule(): ComposeTestRule = createEmptyComposeRule()

    fun ruleChain(
        composeRule: ComposeTestRule,
        activityRule: ActivityTestRule<*>,
    ): TestRule = RuleChain.outerRule(composeRule).around(activityRule)
}
