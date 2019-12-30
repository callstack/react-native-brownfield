package com.callstack.nativeexample;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import androidx.appcompat.app.AppCompatActivity;
import com.callstack.reactnativebrownfield.ReactNativeActivity;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        getSupportActionBar().hide();
    }

    public void startReactNative(View view) {
        Intent intent = ReactNativeActivity.createReactActivityIntent(
                this,
                "ReactNative"
        );
        startActivity(intent);
        overridePendingTransition(R.anim.slide_fade_in, android.R.anim.fade_out);
    }

    public void startReactNativeFragment(View view) {
        Intent intent = new Intent(this, ReactNativeFragmentActivity.class);
        startActivity(intent);
        overridePendingTransition(R.anim.slide_fade_in, android.R.anim.fade_out);
    }
}
