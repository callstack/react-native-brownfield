package com.callstack.nativeexample;

import android.app.Application;
import android.util.Log;
import com.facebook.react.PackageList;
import com.facebook.react.ReactPackage;
import com.callstack.reactnativebrownfield.BridgeManagerJava;

import java.util.HashMap;
import java.util.List;

public class MainApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        List<ReactPackage> packages = new PackageList(this).getPackages();
        HashMap<String, Object> options = new HashMap<>();
        options.put("packages", packages);
        options.put("mainModuleName", "example/native/index");

        BridgeManagerJava.initialize(options, this);
        BridgeManagerJava.getShared().startReactNative(init -> {
            Log.d("test", "test");
        });

    }
}
