import groovy.json.JsonOutput
import groovy.json.JsonSlurper

plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("com.callstack.react.brownfield")
    `maven-publish`
    id("com.facebook.react")
}

publishing {
    publications {
        create<MavenPublication>("mavenAar") {
            groupId = "{{GROUP_ID}}"
            artifactId = "{{ARTIFACT_ID}}"
            version = "{{ARTIFACT_VERSION}}"
            afterEvaluate {
                from(components.getByName("default"))
            }
        }
    }

    repositories {
        mavenLocal() // publishes to the local Maven repository (~/.m2/repository by default)
    }
}

react {
    autolinkLibrariesWithApp()
}

android {
    namespace = "{{PACKAGE_NAME}}"
    compileSdk = {{COMPILE_SDK_VERSION}}

    defaultConfig {
        minSdk = {{MIN_SDK_VERSION}}

        buildConfigField(
            "boolean",
            "IS_EDGE_TO_EDGE_ENABLED",
            properties["edgeToEdgeEnabled"].toString()
        )
        buildConfigField(
            "boolean",
            "IS_NEW_ARCHITECTURE_ENABLED",
            properties["newArchEnabled"].toString()
        )
        buildConfigField("boolean", "IS_HERMES_ENABLED", properties["hermesEnabled"].toString())

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    publishing {
        multipleVariants {
            allVariants()
        }
    }
}

dependencies {
    api("com.facebook.react:react-android:{{RN_VERSION}}")
    api("com.facebook.react:hermes-android:{{RN_VERSION}}")

    api("io.coil-kt.coil3:coil-compose:3.2.0")
    api("io.coil-kt.coil3:coil-network-okhttp:3.2.0")
}
