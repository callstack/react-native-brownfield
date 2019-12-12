package com.callstack.nativeexample;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.FrameLayout;

import androidx.appcompat.app.AppCompatActivity;

import com.callstack.reactnativebrownfield.ComponentTypes;
import com.callstack.reactnativebrownfield.GreenSquare;
import com.callstack.reactnativebrownfield.ReactNativeActivity;
import com.callstack.reactnativebrownfield.ReactNativeCallback;
import com.callstack.reactnativebrownfield.ReactNativeComponent;
import com.callstack.reactnativebrownfield.ReactNativeComponentFactory;

import java.util.HashMap;

public class MainActivity extends AppCompatActivity {
    GreenSquare gs;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        getSupportActionBar().hide();

        ReactNativeComponent red = ReactNativeComponentFactory.create(ComponentTypes.RedSquare, getApplicationContext());

//        HashMap<String, Object> greenProps = new HashMap<>();
//        greenProps.put("text", "TESTXD");
//        greenProps.put("onPress", (ReactNativeCallback) () -> {
//            this.runOnUiThread(() -> {
//                Bundle greenPropsNew = new Bundle();
//                greenPropsNew.putString("text", "TESTLOOL");
//
//                red.setAppProperties(greenPropsNew);
//            });
//
//
//        });

//        ReactNativeComponent green = ReactNativeComponentFactory.create(ComponentTypes.GreenSquare, getApplicationContext(), greenProps);
        gs = new GreenSquare(getApplicationContext(), "TESToo");
        FrameLayout greenSquare = findViewById(R.id.greenSquare);
        greenSquare.addView(gs);

        FrameLayout redSquare = findViewById(R.id.redSquare);
        redSquare.addView(red);
    }

    public void startReactNative(View view) {
        gs.setText("aaa");
        gs.requestLayout();
//        Intent intent = ReactNativeActivity.createReactActivityIntent(
//                this,
//                "ReactNative"
//        );
//        startActivity(intent);
//        overridePendingTransition(R.anim.slide_fade_in, android.R.anim.fade_out);
    }

    public void startReactNativeFragment(View view) {
        Intent intent = new Intent(this, ReactNativeFragmentActivity.class);
        startActivity(intent);
        overridePendingTransition(R.anim.slide_fade_in, android.R.anim.fade_out);
    }
}
