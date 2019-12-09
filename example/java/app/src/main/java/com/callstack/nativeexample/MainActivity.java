package com.callstack.nativeexample;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.FrameLayout;

import androidx.appcompat.app.AppCompatActivity;

import com.callstack.reactnativebrownfield.ComponentTypes;
import com.callstack.reactnativebrownfield.ReactNativeActivity;
import com.callstack.reactnativebrownfield.ReactNativeCallback;
import com.callstack.reactnativebrownfield.ReactNativeComponentFactory;

import java.util.HashMap;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        getSupportActionBar().hide();

        HashMap<String, Object> greenProps = new HashMap<>();
        greenProps.put("text", "TESTXD");
        greenProps.put("onPress", (ReactNativeCallback) () -> Log.d("TEST", "Logged"));

        FrameLayout greenSquare = findViewById(R.id.greenSquare);
        greenSquare.addView(ReactNativeComponentFactory.create(ComponentTypes.GreenSquare, getApplicationContext(), greenProps));

        FrameLayout redSquare = findViewById(R.id.redSquare);
        redSquare.addView(ReactNativeComponentFactory.create(ComponentTypes.RedSquare, getApplicationContext()));
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
