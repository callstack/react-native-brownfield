# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Public API consumed from the Brownfield AAR.
-keep class com.rnapp.brownfieldlib.BrownfieldStore { *; }
-keep class com.rnapp.brownfieldlib.BrownfieldStore$Companion { *; }
-keep class com.rnapp.brownfieldlib.User { *; }
-keep class com.rnapp.brownfieldlib.SettingsStore { *; }
-keep class com.rnapp.brownfieldlib.SettingsStore$Companion { *; }
-keep class com.rnapp.brownfieldlib.Theme { *; }
-keep class com.rnapp.brownfieldlib.ReactNativeHostManager { *; }

# Generated API for brownfield-navigation API consumed from the Brownfield AAR
-keep class com.callstack.nativebrownfieldnavigation.UserType { *; }