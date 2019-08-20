package com.callstack.nativeexample;

import android.app.Application;
import android.util.Log;
import com.callstack.reactnativebrownfield.ReactNativeBrownfield;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;

import java.util.HashMap;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {
    @Override
    public void onCreate() {
        super.onCreate();
        List<ReactPackage> packages = new PackageList(this).getPackages();
        HashMap<String, Object> options = new HashMap<>();
        options.put("packages", packages);
        options.put("mainModuleName", "example/index");

        ReactNativeBrownfield.initialize(options, this);
        ReactNativeBrownfield.getShared().startReactNative(init -> {
            Log.d("test", "test");
        });
    }

    @Override
    public ReactNativeHost getReactNativeHost() {
        return ReactNativeBrownfield.getShared().getReactNativeHost();
    }
}
