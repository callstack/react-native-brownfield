## Objective-C

React Native Brownfield provides first-class support for Java.

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

| Param                   | Required | Type                 | Description                                             |
| ----------------------- | -------- | -------------------- | ------------------------------------------------------- |
| application             | Yes      | Application          | Main application.                                       |
| rnHost                  | No*      | ReactNativeHost      | A instance of [ReactNativeHost](https://bit.ly/2ZnwgnA). |
| packages                | No*      | List<ReactPackage>   | List of your React Native Native modules. |
| options                 | No*      | HashMap<String, Any> | Map of initial options. __Options listed below.__ |

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
  HashMap<String, Object> options = new HashMap<>();
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

| Property                   | Type      | Default        | Description                                        |
| --------------------       | --------- | -------------- | -------------------------------------------------- |
| bridge                     | RCTBridge | nil            | Launch options, typically passed from AppDelegate. |
| entryFile                  | NSString  | index          | Path to JavaScript root.                           |
| fallbackResource           | NSString  | nil            | Path to bundle fallback resource.                  |
| bundlePath                 | NSString  | main.jsbundle  | Path to bundle fallback resource.                  |

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

### Linking

You can find an example app [here](../example/java).


