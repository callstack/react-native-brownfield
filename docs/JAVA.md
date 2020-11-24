## Java

React Native Brownfield provides first-class support for Java.

### Kotlin setup

Even though the library provides a first-class Java support, it's written in Kotlin. To compile the project with React Native Brownfield, we need to make sure that our project's `build.gradle` file contains the required Gradle plugin. 

```java
buildscript {
    ext {
        ...
        kotlinVersion = '1.3.31'
    }
    dependencies {
        ...
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion"
    }
}
```

### Linking

The library is meant to work with [auto linking](https://github.com/react-native-community/cli/blob/master/docs/autolinking.md). In case you can't use this feature, please check out the following options:

<details>
<summary>react-native link</summary>
Run the following command in your terminal:

```bash
  react-native link @callstack/react-native-brownfield
```
</details>

<details>
<summary>Manually link the library on Android</summary>

#### `android/settings.gradle`
```groovy
include ':react-native-brownfield'
project(':react-native-brownfield').projectDir = new File(rootProject.projectDir, '../node_modules/@callstack/react-native-brownfield/android')
```

#### `android/app/build.gradle`
```groovy
dependencies {
   ...
   implementation project(':react-native-brownfield')
}
```

#### `android/app/src/main/.../MainApplication.java`
On top, where imports are:

```java
import com.callstack.reactnativebrownfield.ReactNativeBrownfieldPackage;
```

Add the `ReactNativeBrownfieldPackage` class to your list of exported packages.

```java
@Override
protected List<ReactPackage> getPackages() {
    return Arrays.asList(
            new MainReactPackage(),
            new ReactNativeBrownfieldPackage()
    );
}
```
</details>

### API Reference

#### ReactNativeBrownfield

You can import the object from:

```java
  import com.callstack.reactnativebrownfield.ReactNativeBrownfield;
```

---

**Statics:**

`initialize`

A function used to initialize a React Native Brownfield singleton. Keep in mind that it **doesn't** load React Native bundle.

Params:

| Param                   | Required | Type                 | Description                                               |
| ----------------------- | -------- | -------------------- | --------------------------------------------------------- |
| application             | Yes      | Application          | Main application.                                         |
| rnHost                  | No*      | ReactNativeHost      | An instance of [ReactNativeHost](https://bit.ly/2ZnwgnA). |
| packages                | No*      | List<ReactPackage>   | List of your React Native Native modules.                 |
| options                 | No*      | HashMap<String, Any> | Map of initial options. __Options listed below.__         |

> * - Those fields aren't itself required, but at least one of them is. See examples below.

Available options:
- useDeveloperSupport: Boolean - Flag to use dev support.
- packages: List<ReactPackage> - List of your React Native Native modules.
- mainModuleName: String - Path to react native entry file.

Examples:

```java
  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      @SuppressWarnings("UnnecessaryLocalVariable")
      List<ReactPackage> packages = new PackageList(this).getPackages();
      // Packages that cannot be autolinked yet can be added manually here, for example:
      // packages.add(new MyReactNativePackage());
      return packages;
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  ReactNativeBrownfield.initialize(this, mReactNativeHost);
```

```java
  List<ReactPackage> packages = new PackageList(this).getPackages();

  ReactNativeBrownfield.initialize(this, packages);
```

```java
  List<ReactPackage> packages = new PackageList(this).getPackages();
  HashMap<String, Object> options = new HashMap<String, Any>();
  options.put("packages", packages);
  options.put("mainModuleName", "example/index");

  ReactNativeBrownfield.initialize(this, options);
```

---

`getShared`

A singleton that keeps an instance of ReactNativeBrownfield object.

Examples: 

```java
  ReactNativeBrownfield.getShared()
```

---

**Properties:**

| Property        | Type            | Default        | Description                                               |
| --------------- | --------------- | -------------- | --------------------------------------------------------- |
| reactNativeHost | ReactNativeHost | null           | An instance of [ReactNativeHost](https://bit.ly/2ZnwgnA). |

---

**Methods:**

`startReactNative`

Starts React Native, produces an instance of a bridge. You can use it to initialize React Native in your app.

Params:

| Param                   | Required | Type          | Description                                           |
| ----------------------- | -------- | ------------- | ----------------------------------------------------- |
| startReactNative        | No       | Lambda        | Callback invoked after JS bundle is fully loaded.     |

Examples:

```java
    ReactNativeBrownfield.getShared().startReactNative();
```

```java
    ReactNativeBrownfield.getShared().startReactNative(init -> {
        Log.d("loaded", "React Native loaded");
    });
```

---

#### ReactNativeActivity

An activity rendering `ReactRootView` with a given module name.  It automatically uses an instance of a bridge created in `startReactNative` method. It works well with exposed JavaScript module. All the lifecycles are proxied to `ReactInstanceManager`.

```java
  import com.callstack.reactnativebrownfield.ReactNativeActivity;
```

---

**Statics:**

`createReactActivityIntent`

Creates an Intent with ReactNativeActivity, you can use it as a parameter in the `startActivity` method in order to push a new activity with embedded React Native.

Params:

| Param                   | Required | Type                 | Description                                                 |
| ----------------------- | -------- | ------------------------------------------- | ----------------------------------------------------------- |
| context                 | Yes      | Context                                     | Application context.                                        |
| moduleName              | Yes      | String                                      | Name of React Native component registered to `AppRegistry`. |
| initialProps            | No       | Bundle || HashMap<String, *> || ReadableMap | Initial properties to be passed to React Native component.  |

Examples: 

```java
  ReactNativeActivity.createReactActivityIntent(context, "ReactNative");
```

```java
  Bundle bundle = new Bundle();
  bundle.putInt("score", 12);

  ReactNativeActivity.createReactActivityIntent(context, "ReactNative", bundle);
```

```java
  HashMap map = new HashMap<String, *>();
  map.put("score", 12);

  ReactNativeActivity.createReactActivityIntent(context, "ReactNative", map);
```

```java
  WritableMap map = new WritableMap();
  map.putInt("score", 12);

  ReactNativeActivity.createReactActivityIntent(context, "ReactNative", map);
```

---

#### ReactNativeFragment

An fragment rendering `ReactRootView` with a given module name.  It automatically uses an instance of a bridge created in `startReactNative` method. It works well with exposed JavaScript module. All the lifecycles are proxied to `ReactInstanceManager`. It's the simplest way to embed React Native into your navigation stack.

```java
  import com.callstack.reactnativebrownfield.ReactNativeFragment;
```

---

**Statics:**

`createReactNativeFragment`

Creates a Fragment with ReactNativeActivity, you can use it as a parameter in the `startActivity` method in order to push a new activity with embedded React Native.

Params:

| Param                   | Required | Type                 | Description                                                 |
| ----------------------- | -------- | ------------------------------------------- | ----------------------------------------------------------- |
| moduleName              | Yes      | String                                      | Name of React Native component registered to `AppRegistry`. |
| initialProps            | No       | Bundle || HashMap<String, *> || ReadableMap | Initial properties to be passed to React Native component.  |

Examples: 

```java
  ReactNativeFragment.createReactNativeFragment("ReactNative");
```

```java
  Bundle bundle = new Bundle();
  bundle.putInt("score", 12);

  ReactNativeFragment.createReactNativeFragment("ReactNative", bundle);
```

```java
  HashMap map = new HashMap<String, *>();
  map.put("score", 12);

  ReactNativeFragment.createReactNativeFragment("ReactNative", map);
```

```java
  WritableMap map = new WritableMap();
  map.putInt("score", 12);

  ReactNativeFragment.createReactActivityIntent(context, "ReactNative", map);
```

---

### Example

You can find an example app [here](../example/java).


