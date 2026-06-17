package com.callstack.brownfield.android.example

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import androidx.test.rule.ActivityTestRule
import com.wix.detox.Detox
import com.wix.detox.config.DetoxConfig
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@LargeTest
class DetoxTest {
    private val activityRule = ActivityTestRule(MainActivity::class.java, false, false)
    private val composeRule = ComposeDetoxBridge.emptyComposeRule()

    @get:Rule
    val ruleChain = ComposeDetoxBridge.ruleChain(composeRule, activityRule)

    @Test
    fun runDetoxTests() {
        val detoxConfig = DetoxConfig().apply {
            rnContextLoadTimeoutSec = 120
        }
        Detox.runTests(activityRule, detoxConfig)
    }
}
