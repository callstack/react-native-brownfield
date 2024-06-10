package com.callstack.kotlinexample

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.callstack.reactnativebrownfield.ReactNativeActivity
import android.view.View


class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
    }

    fun startReactNative(view: View) {
        val intent = ReactNativeActivity.createReactActivityIntent(
            this,
            "ReactNative"
        )
        startActivity(intent)
        overridePendingTransition(R.anim.slide_fade_in, android.R.anim.fade_out)
    }

    fun startReactNativeFragment(view: View) {
        val intent = Intent(this, ReactNativeFragmentActivity::class.java)
        startActivity(intent)
        overridePendingTransition(R.anim.slide_fade_in, android.R.anim.fade_out)
    }
}
