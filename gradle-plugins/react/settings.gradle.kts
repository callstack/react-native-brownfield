pluginManagement {
    repositories {
        google()
        mavenCentral()
    }
    plugins {
        id("com.android.library") version "8.5.2"
        id("org.jetbrains.kotlin.android") version "1.9.24"
    }
}

rootProject.name = "react-brownfield-plugin"

include(":example-android-library")
includeBuild("brownfield")
