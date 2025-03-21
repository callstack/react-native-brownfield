## Kotlin

React Native Brownfield provides first-class support for Kotlin.

### API Reference

#### `ReactNativeBrownfield`

You can import the object from:

```java
import com.callstack.reactnativebrownfield.ReactNativeBrownfield
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

```kotlin
import com.callstack.reactnativebrownfield.ReactNativeBrownfield

val mReactNativeHost = object : ReactNativeHost(application) {
  override fun getUseDeveloperSupport(): Boolean {
    return BuildConfig.DEBUG
  }

  override fun getPackages(): List<ReactPackage> {
    return listOf<ReactPackage>(PackageList(this).getPackages())
  }

  override fun getJSMainModuleName(): String {
    return "index"
  }
}

ReactNativeBrownfield.initialize(this, mReactNativeHost)
```

```kotlin
val packages = PackageList(this).getPackages()

ReactNativeBrownfield.initialize(this, packages)
```

```kotlin
val packages = PackageList(this).getPackages()
val options = hashMapOf<String, Any>(
  "packages" to packages, 
  "mainModuleName" to "example/index"
)

ReactNativeBrownfield.initialize(this, options)
```

---

`shared`

A singleton that keeps an instance of ReactNativeBrownfield object.

Examples: 

```kotlin
ReactNativeBrownfield.shared
```

---

**Properties:**

| Property        | Type            | Default        | Description                                               |
| --------------- | --------------- | -------------- | --------------------------------------------------------- |
| reactNativeHost | `ReactNativeHost` | null           | An instance of [ReactNativeHost](https://bit.ly/2ZnwgnA). |

---

**Methods:**

`startReactNative`

Starts React Native, produces an instance of React Native. You can use it to initialize React Native in your app.

Params:

| Param                   | Required | Type          | Description                                           |
| ----------------------- | -------- | ------------- | ----------------------------------------------------- |
| startReactNative        | No       | `(loaded: boolean) -> Unit` | Callback invoked after JS bundle is fully loaded.     |

Examples:

```kotlin
ReactNativeBrownfield.shared.startReactNative()
```

```kotlin
ReactNativeBrownfield.shared.startReactNative {
  Log.d("loaded", "React Native loaded");
}
```

---

`createView`

Creates a React Native view with a given module name. It automatically uses an instance of React Native created in `startReactNative` method. This is useful when embedding React Native views directly in your native layouts or Jetpack Compose UI.

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

```kotlin
// In a Fragment or Activity
val reactView = ReactNativeBrownfield.shared.createView(
  context,
  activity,
  "ReactNative"
)
container.addView(reactView)
```

```kotlin
// With Jetpack Compose
AndroidView(
  factory = { context ->
    ReactNativeBrownfield.shared.createView(context, fragmentActivity, "ReactNative")
  },
  modifier = Modifier.fillMaxSize()
)
```

---

#### `ReactNativeFragment`

An fragment rendering `ReactRootView` with a given module name. It automatically uses a instance of React Native created in `startReactNative` method. It works well with exposed JavaScript module. All the lifecycles are proxied to `ReactInstanceManager`. It's the simplest way to embed React Native into your navigation stack.

```kotlin
import com.callstack.reactnativebrownfield.ReactNativeFragment
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

```kotlin
ReactNativeFragment.createReactNativeFragment("ReactNative")
```

```kotlin
val bundle = Bundle()
bundle.putInt("score", 12)

ReactNativeFragment.createReactNativeFragment("ReactNative", bundle)
```

```kotlin
val map = hashMapOf<String, *>("score" to 12)

ReactNativeFragment.createReactNativeFragment("ReactNative", map)
```

```kotlin
val map = WritableMap()
map.putInt("score", 12)

ReactNativeFragment.createReactNativeFragment("ReactNative", map)
```

---

### Example

You can find an example app [here](../example/kotlin).
