-keep class com.callstack.brownie.BrownieStoreBridge {
    void onStoreDidChange(java.lang.String);
    native <methods>;
}

-keep class com.callstack.brownie.Store { *; }
-keep class com.callstack.brownie.StoreKt { *; }
-keep class com.callstack.brownie.StoreManager { *; }
-keep class com.callstack.brownie.StoreManager$Companion { *; }
-keep class com.callstack.brownie.StoreManagerKt { *; }
-keep class com.callstack.brownie.BrownieStoreRegistrationKt { *; }