package com.callstack.reactnativebrownfield;

import android.app.Application;
import com.facebook.react.ReactNativeHost;
import kotlin.Unit;
import kotlin.jvm.functions.Function1;

public class BridgeManagerJava {
    private BridgeManagerJava() {}

    public static BridgeManagerJava getShared() {
        return BridgeManagerJavaHolder.INSTANCE;
    }

    private static class BridgeManagerJavaHolder {
        private static final BridgeManagerJava INSTANCE = new BridgeManagerJava();
    }

    public static void initialize(ReactNativeHost rnHost, Application application) {
        BridgeManager.Companion.initialize(rnHost, application);
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
