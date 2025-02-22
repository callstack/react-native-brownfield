
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("com.callstack.rnbrownfield-gradle-plugin")
}

repositories {
    google()
    mavenCentral()
}

android {
    namespace = "com.callstack.example"
    compileSdk = 34

    defaultConfig {
        minSdk = 24
    }

    buildTypes {
        release {}
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}