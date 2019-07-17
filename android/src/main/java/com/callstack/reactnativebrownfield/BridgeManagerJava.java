package com.callstack.reactnativebrownfield;

import android.app.Application;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import kotlin.Unit;
import kotlin.jvm.functions.Function1;

import java.util.HashMap;
import java.util.List;

public class BridgeManagerJava {
    private BridgeManagerJava() {}

    public static BridgeManagerJava getShared() {
        return BridgeManagerJavaHolder.INSTANCE;
    }

    private static class BridgeManagerJavaHolder {
        private static final BridgeManagerJava INSTANCE = new BridgeManagerJava();
    }

    public ReactNativeHost getReactNativeHost() {
        return BridgeManager.Companion.getShared().getReactNativeHost();
    }

    public static void initialize(ReactNativeHost rnHost, Application application) {
        BridgeManager.Companion.initialize(rnHost, application);
    }

    public static void initialize(HashMap<String, Object> options, Application application) {
        BridgeManager.Companion.initialize(options, application);
    }

    public static void initialize(List<ReactPackage> packages, Application application) {
        BridgeManager.Companion.initialize(packages, application);
    }

    public void startReactNative(final CallbackInterface listener) {
        BridgeManager.Companion.getShared().startReactNative(new Function1<Boolean, Unit>() {
            @Override
            public Unit invoke(Boolean initialized) {
                listener.callback(initialized);
                return null;
            }
        });
    }
}
