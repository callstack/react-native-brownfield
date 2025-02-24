
plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("com.callstack.rnbrownfield-plugin")
}

rnbrownfield {}

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

    flavorDimensions += "env"

    productFlavors {
        create("free") {
            dimension = "env"
        }
        create("paid") {
            dimension = "env"
        }
    }

    buildTypes {
        release {}
        debug {}
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}