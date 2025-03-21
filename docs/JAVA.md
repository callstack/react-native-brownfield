## Java

React Native Brownfield provides first-class support for Java.

### Kotlin setup

Even though the library provides a first-class Java support, it's written in Kotlin. To compile the project with React Native Brownfield, we need to make sure that our project's `build.gradle` file contains the required Gradle plugin. 

```java
buildscript {
    ext {
        ...
        kotlinVersion = '2.0.21'
    }
    dependencies {
        ...
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion"
    }
}
```

### API Reference

#### `ReactNativeBrownfield`

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
| application             | Yes      | `Application`          | Main application.                                         |
| rnHost                  | No*      | `ReactNativeHost`      | An instance of [ReactNativeHost](https://bit.ly/2ZnwgnA). |
| packages                | No*      | `List<ReactPackage>`   | List of your React Native Native modules.                 |
| options                 | No*      | `HashMap<String, Any>` | Map of initial options. __Options listed below.__         |

> * - Those fields aren't itself required, but at least one of them is. See examples below.

Available options:
- `useDeveloperSupport`: `Boolean` - Flag to use dev support.
- `packages`: `List<ReactPackage>` - List of your React Native Native modules.
- `mainModuleName`: `String` - Path to react native entry file.

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
| reactNativeHost | `ReactNativeHost` | null           | An instance of [ReactNativeHost](https://bit.ly/2ZnwgnA). |

---

**Methods:**

`startReactNative`

Starts React Native, produces an instance of react native. You can use it to initialize React Native in your app.

Params:

| Param                   | Required | Type          | Description                                           |
| ----------------------- | -------- | ------------- | ----------------------------------------------------- |
| startReactNative        | No       | `Lambda`        | Callback invoked after JS bundle is fully loaded.     |

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

`createView`

Creates a React Native view with a given module name. It automatically uses an instance of React Native created in `startReactNative` method. This is useful when embedding React Native views directly in your native layouts.

Params:

| Param          | Required | Type                | Description                                                 |
| -------------- | -------- | ------------------- | ----------------------------------------------------------- |
| context        | Yes      | `Context`           | Android context to create the view                          |
| activity       | No       | `FragmentActivity`  | Activity hosting the view, used for lifecycle management    |
| moduleName     | Yes      | `String`            | Name of React Native component registered to `AppRegistry`  |
| launchOptions  | No       | `Bundle`            | Initial properties to be passed to React Native component   |

Returns:
`FrameLayout` - A view containing the React Native component.

Examples:

```java
// In a Fragment or Activity
FrameLayout reactView = ReactNativeBrownfield.getShared().createView(
  context,
  activity,
  "ReactNative"
);
container.addView(reactView);
```

---

#### `ReactNativeFragment`

An fragment rendering `ReactRootView` with a given module name.  It automatically uses an instance of a React Native created in `startReactNative` method. It works well with exposed JavaScript module. All the lifecycles are proxied to `ReactInstanceManager`. It's the simplest way to embed React Native into your navigation stack.

```java
import com.callstack.reactnativebrownfield.ReactNativeFragment;
```

---

**Statics:**

`createReactNativeFragment`

Creates a Fragment with `ReactNativeActivity`, you can use it as a parameter in the `startActivity` method in order to push a new activity with embedded React Native.

Params:

| Param                   | Required | Type                 | Description                                                 |
| ----------------------- | -------- | ------------------------------------------- | ----------------------------------------------------------- |
| moduleName              | Yes      | `String`                                      | Name of React Native component registered to `AppRegistry`. |
| initialProps            | No       | `Bundle` \|\| `HashMap<String, *>` \|\| `ReadableMap` | Initial properties to be passed to React Native component.  |

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

ReactNativeFragment.createReactNativeFragment("ReactNative", map);
```

---

### Example

You can find an example app [here](../example/kotlin).
