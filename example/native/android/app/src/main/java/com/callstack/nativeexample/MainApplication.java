package com.callstack.nativeexample;

import android.app.Application;
import android.util.Log;
import com.callstack.reactnativebrownfield.BridgeManager;
import com.facebook.react.PackageList;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.soloader.SoLoader;
import com.callstack.reactnativebrownfield.BridgeManagerJava;

import java.util.List;

public class MainApplication extends Application {

    private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
            @SuppressWarnings("UnnecessaryLocalVariable")
            List<ReactPackage> packages = new PackageList(this).getPackages();
            // Packages that cannot be autolinked yet can be added manually here, for example:
            // packages.add(new MyReactNativePackage());
            return packages;
        }

        @Override
        protected String getJSMainModuleName() {
            return "index";
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        BridgeManagerJava.initialize(mReactNativeHost, this);
        BridgeManagerJava.getShared().startReactNative(init -> {
            Log.d("test", "test");
        });

    }
}
