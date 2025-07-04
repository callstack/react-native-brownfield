package com.callstack.kotlinexample

import android.os.Bundle
import android.view.KeyEvent
import androidx.appcompat.app.AppCompatActivity
import com.callstack.reactnativebrownfield.ReactNativeFragment

class ReactNativeFragmentActivity : AppCompatActivity() {

  public override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_react_native_fragment)

    if (savedInstanceState == null) {
      val reactNativeFragment = ReactNativeFragment.createReactNativeFragment("ReactNative")
      supportFragmentManager.beginTransaction()
        .add(R.id.container_main, reactNativeFragment)
        .commit()
    }
  }

  override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
    var handled = false
    val activeFragment = supportFragmentManager.findFragmentById(R.id.container_main)
    if (activeFragment is ReactNativeFragment) {
      handled = activeFragment.onKeyUp(keyCode, event)
    }
    return handled || super.onKeyUp(keyCode, event)
  }
}
