package com.callstack.nativeexample;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import com.callstack.reactnativebrownfield.BridgeManagerJava;
import com.callstack.reactnativebrownfield.ReactNativeActivity;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        getSupportActionBar().hide();
    }

    public void startReactNative(View view) {
        Intent intent = new Intent(this, ReactNativeActivity.class);
        intent.putExtra(ReactNativeActivity.MODULE_NAME, "ReactNative");
        startActivity(intent);
    }
}
