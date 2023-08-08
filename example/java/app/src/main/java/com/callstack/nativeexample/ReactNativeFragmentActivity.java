package com.callstack.nativeexample;

import android.os.Bundle;
import android.view.KeyEvent;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import com.callstack.reactnativebrownfield.ReactNativeFragment;
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler;

import javax.annotation.Nullable;

public class ReactNativeFragmentActivity extends AppCompatActivity implements DefaultHardwareBackBtnHandler {
    @Override
    public void invokeDefaultOnBackPressed() {
        super.onBackPressed();
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_react_native_fragment);

        if (savedInstanceState == null) {
            ReactNativeFragment reactNativeFragment = ReactNativeFragment.createReactNativeFragment("ReactNative");
            getSupportFragmentManager().beginTransaction()
                    .add(R.id.container_main, reactNativeFragment)
                    .commit();
        }
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        boolean handled = false;
        Fragment activeFragment = getSupportFragmentManager().findFragmentById(R.id.container_main);
        if (activeFragment instanceof ReactNativeFragment) {
            handled = ((ReactNativeFragment)activeFragment).onKeyUp(keyCode, event);
        }
        return handled || super.onKeyUp(keyCode, event);
    }

    @Override
    public void onBackPressed() {
        Fragment activeFragment = getSupportFragmentManager().findFragmentById(R.id.container_main);
        if (activeFragment instanceof ReactNativeFragment) {
            ((ReactNativeFragment)activeFragment).onBackPressed(this);
        } else {
            super.onBackPressed();
        }
    }
}
