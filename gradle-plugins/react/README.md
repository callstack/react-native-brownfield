### React Native Brownfield Gradle Plugin

This plugin helps you convert your react-native brownfield implementation into a fat Aar.

#### Installation

##### From Remote

- TBA

##### From Local

- From the root of this repository, run `yarn brownfield:plugin:publish:local` and it will publish the plugin to your local maven
- Then add the following patch to your react-native brownfield `build.gradle` files:

```diff
diff --git a/android/build.gradle b/android/build.gradle
index 3dd1ac9..0db4ded 100644
--- a/android/build.gradle
+++ b/android/build.gradle
@@ -16,6 +16,7 @@ buildscript {
         }
+        mavenLocal()
         google()
         mavenCentral()
     }
@@ -23,7 +24,7 @@ buildscript {
         classpath("com.android.tools.build:gradle")
         classpath("com.facebook.react:react-native-gradle-plugin")
         classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
+       classpath("com.callstack.react:brownfield:0.1.0")
     }
 }
 
diff --git a/android/rnbrownfield/build.gradle.kts b/android/rnbrownfield/build.gradle.kts
index b915003..e387075 100644
--- a/android/rnbrownfield/build.gradle.kts
+++ b/android/rnbrownfield/build.gradle.kts
@@ -1,7 +1,7 @@
 plugins {
     id("com.android.library")
     id("org.jetbrains.kotlin.android")
+    id("com.callstack.react.brownfield")
     `maven-publish`
     id("com.facebook.react")
 }
@@ -10,8 +10,8 @@ react {
     autolinkLibrariesWithApp()
 }
 
 val appProject = project(":app")
```

#### API Usage

- **About Dependencies**

You can `embed` dependencies in your Aar by using this configuration. It is as simple as doing the following:

```kts
dependencies {
    embed("com.facebook.react:hermes-android:0.77.0")
    embed("com.google.android.material:material:0.7.0")
}
```

The `embed` configuration is useful, only if you want to bundle these dependencies within your fat Aar. Be careful that it can result in clashes between the bundled version of a dependency and the version used by the App. What this means is consider you embedded dependencyA with version 0.0.1 and the native App which will use your Aar also uses dependencyA but with version 0.0.2, it will produce a clash.

If you are sure that the native App will never use the dependency you have embedded within your Aar, you should be fine with using `embed`. But if you know before hand that those dependencies can be used by the native App then it's better for you to avoid embedding and instead use either of `implementation` and `compileOnly` configuration and surface it with the native team that the Aar relies on the App to provide these dependencies.

When you use `implementation` or `compileOnly`, this plugin does not bundle those dependencies in your Aar and instead just uses them to provide for the compile time. Using these configuration is as simple as:

```kts
dependencies {
    implementation("com.facebook.react:hermes-android:0.77.0")
    compileOnly("com.google.android.material:material:0.7.0")
}
```

There is one more configuration called `api` and it is often the one you should use. The reason is that this configuration tells gradle to provide for these dependencies in compile time while developing and also provide these when the generated Aar is consumed by the native App. For the latter, you will need to use it in combination with `pom.xml` as the latter will only work if you have dependencies marked with `api` listed in `pom.xml`.

```kts
    api("com.facebook.react:react-android:0.77.0")
    api("com.facebook.react:hermes-android:0.77.0")
    implementation("com.google.android.material:material:0.7.0")
```

In react-native brownfield, when we want to use `react-android` and `hermes-android` in the Aar, we can use `api` to allow us developing and also tell gradle to provide these dependencies and it's transitive ones as well, using `pom.xml`. If the native App uses one of the transitive dependency say `javax.inject`, gradle will automatically pick the highest version. This is often the ideal usage scenario where we don't want the native App team to worry about react-native's dependencies and transitive dependencies.

<hr/>

We can use `exclude` to not embed a nested dependency:

```kts
dependencies {
    embed("com.facebook.fbjni:fbjni:0.4.0") {
        exclude("com.facebook.soloader")
    }
}
```

<hr/>

#### Tooling

- We are using `ktlint` and `detekt` for formatting and linting
- You can run `./gradlew :brownfield:lint` to auto-format and detect linting issues


#### Architecture

Below is a flow diagram of how the files are being used in this gradle plugin from an overview:

![react-brownfield-architecture](../../screenshots/react-brownfield-arch.png)

