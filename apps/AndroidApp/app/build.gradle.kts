plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

configurations.all {
    resolutionStrategy {
        // force Gradle to always check for new versions of changing modules
        cacheChangingModulesFor(0, "seconds")
        cacheDynamicVersionsFor(0, "seconds")
    }
}

android {
    namespace = "com.callstack.brownfield.android.example"
    compileSdk {
        version = release(36)
    }

    defaultConfig {
        applicationId = "com.callstack.brownfield.android.example"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("debug")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.material)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.appcompat)
    implementation(libs.brownfieldlib)
//    implementation(libs.brownfieldlib) {
//        exclude("host.exp.exponent", "expo.modules.webbrowser")
//    }

//    implementation("expo:core:54.0.31")
//    implementation("BareExpo:expo.modules.image:3.0.11")
//    implementation("host.exp.exponent:expo.modules.webbrowser:15.0.10")
//    implementation("expo.modules.asset:expo.modules.asset:12.0.12")
//    implementation("io.coil-kt.coil3:coil-compose:3.2.0")
//    implementation("io.coil-kt.coil3:coil-network-okhttp:3.2.0")

//    implementation("io.coil-kt.coil3:coil-compose:3.2.0")
//    implementation("io.coil-kt.coil3:coil-network-okhttp:3.2.0")
//    implementation("androidx.compose.material3:material3:1.4.0-alpha10")
//    implementation("androidx.core:core-splashscreen:1.0.1")
//    implementation("io.coil-kt:coil-compose:2.6.0")
//    implementation("androidx.navigation:navigation-compose:2.8.5")
//    implementation("androidx.compose.ui:ui:1.7.6")
//    implementation("androidx.compose.runtime:runtime-saveable:1.7.6")
//    implementation("androidx.compose.material3:material3:1.3.1")
//    implementation("androidx.compose.animation:animation:1.7.6")
//    implementation("androidx.compose.foundation:foundation:1.7.6")
//    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
//    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.7")

    implementation(libs.androidx.fragment.compose)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
