## Swift

React Native Brownfield provides first-class support for Swift. 

### SwiftUI Integration

React Native Brownfield can be easily integrated with SwiftUI apps without requiring the traditional AppDelegate approach. Here's how to initialize React Native in a SwiftUI app:

```swift
import SwiftUI
import ReactNativeBrownfield

@main
struct MyApp: App {
  // Initialize React Native when the app launches
  init() {
    ReactNativeBrownfield.shared.startReactNative {
      print("React Native bundle loaded")
    }
  }
  
  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}
```

To display React Native views in SwiftUI, use the provided `ReactNativeView` component:

```swift
import SwiftUI
import ReactNativeBrownfield

struct ContentView: View {
  var body: some View {
    NavigationView {
      VStack {
        // Your SwiftUI content
        
        NavigationLink("Push React Native Screen") {
          ReactNativeView(moduleName: "ReactNative")
            .navigationBarHidden(true)
        }
      }
    }
  }
}
```

The `ReactNativeView` component is a SwiftUI wrapper around `ReactNativeViewController` that handles navigation and lifecycle events automatically.

### `use_frameworks!` support

It is possible to build `react-native-brownfield` with `use_frameworks!` directive in CocoaPods as long as `React` can be built this way.

| React Native version       | `use_frameworks!` compatibility |
| -------------------------- | ------------------------------- | 
| <= 0.59.X                  | Compatible                      |
| 0.60.X                     | Not compatible                  |
| 0.61.0-rc.0                | Not compatible                  |

Please reffer to [this issue](https://github.com/facebook/react-native/issues/25349) to learn more about `use_frameworks!` state in React Native.

Until this behavior is fixed, you can access `react-native-brownfield` API in Swift via [Bridging Header](../example/swift/BridgingHeader.h).

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
<summary>CocoaPods</summary>
Add the following line to your `Podfile`:

```ruby
  pod 'ReactNativeBrownfield', :path => '../node_modules/@callstack/react-native-brownfield'
```
</details>

<details>
<summary>Manually link the library on iOS</summary>

### `Open project.xcodeproj in Xcode`

Drag `ReactNativeBrownfield.xcodeproj` to your project on Xcode (usually under the Libraries group on Xcode):

![xcode-add](https://facebook.github.io/react-native/docs/assets/AddToLibraries.png)

### Link `libReactNativeBrownfield.a` binary with libraries

Click on your main project file (the one that represents the `.xcodeproj`) select `Build Phases` and drag the static library from the `Products` folder inside the Library you are importing to `Link Binary With Libraries` (or use the `+` sign and choose library from the list):

![xcode-link](https://facebook.github.io/react-native/docs/assets/AddToBuildPhases.png)
</details>

### API Reference

#### ReactNativeBrownfield

You can import the object from:

```swift
  import ReactNativeBrownfield
```

---

**Statics:**

`shared`

A singleton that keeps an instance of ReactNativeBrownfield object.

Examples:

```swift
  ReactNativeBrownfield.shared
```

---

**Properties:**

| Property                   | Type                    | Default        | Description                                        |
| -------------------------- | ----------------------- | -------------- | -------------------------------------------------- |
| entryFile                  | String                  | index          | Path to JavaScript root.                           |
| fallbackResource           | String?                 | nil            | Path to bundle fallback resource.                  |
| bundlePath                 | String                  | main.jsbundle  | Path to bundle fallback resource.                  |
| reactNativeFactory         | RCTReactNativeFactory?  | nil            | React Native factory instance.                     |

---

**Methods:**

`startReactNative`

Starts React Native, produces an instance of a bridge. You can use it to initialize React Native in your app.

Params:

| Param                   | Required | Type          | Description                                           |
| ----------------------- | -------- | ------------- | ----------------------------------------------------- |
| onBundleLoaded          | No       | (() -> Void)? | Callback invoked after JS bundle is fully loaded.     |
| launchOptions           | No       | [AnyHashable: Any]? | Launch options, typically passed from AppDelegate. |

Examples:

```swift
    ReactNativeBrownfield.shared.startReactNative()
```

```swift
   ReactNativeBrownfield.shared.startReactNative(onBundleLoaded: {
     print("React Native started")
   })
```

```swift
    ReactNativeBrownfield.shared.startReactNative(onBundleLoaded: {
      print("React Native started")
    }, launchOptions: launchOptions)
```

---

#### Initialization Approaches

React Native Brownfield supports two main approaches for initialization:

**1. UIKit AppDelegate Approach (Traditional)**

```swift
import UIKit
import ReactNativeBrownfield

class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    ReactNativeBrownfield.shared.startReactNative {
      print("React Native bundle loaded")
    }
    return true
  }
}
```

**2. SwiftUI App Approach (Modern)**

```swift
import SwiftUI
import ReactNativeBrownfield

@main
struct MyApp: App {
  init() {
    ReactNativeBrownfield.shared.startReactNative {
      print("React Native bundle loaded")
    }
  }
  
  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}
```

Both approaches achieve the same result - initializing the React Native bridge when your app launches. Choose the approach that best fits your app architecture.

---

#### ReactNativeViewController

A view controller that's rendering React Native view within its bounds. It automatically uses an instance of a factory created in `startReactNative` method. It works well with exposed JavaScript module. It's the simplest way to embed React Native into your navigation stack.

You can import it from:

```swift
  import ReactNativeBrownfield
```

---

**Constructors:**

`ReactNativeViewController(moduleName: moduleName, initialProperties: initialProperties)`

| Param              | Required  | Type          | Description                                                   |
| ------------------ | --------- | ------------- | ------------------------------------------------------------- |
| moduleName         | Yes       | String        | Name of React Native component registered to `AppRegistry`.   |
| initialProperties  | No        | [String: Any]? | Initial properties to be passed to React Native component.    |

Examples:

```swift
  ReactNativeViewController(moduleName: "ReactNative")
```

```swift
  ReactNativeViewController(moduleName: "ReactNative", initialProperties: ["score": 12])
```

---

#### ReactNativeView

A SwiftUI view that wraps the ReactNativeViewController, making it easy to integrate React Native into SwiftUI navigation flows. It automatically handles navigation events like "pop to native" from React Native.

You can import it from:

```swift
  import ReactNativeBrownfield
```

---

**Constructors:**

`ReactNativeView(moduleName: moduleName, initialProperties: initialProperties)`

| Param              | Required  | Type          | Description                                                   |
| ------------------ | --------- | ------------- | ------------------------------------------------------------- |
| moduleName         | Yes       | String        | Name of React Native component registered to `AppRegistry`.   |
| initialProperties  | No        | [String: Any] | Initial properties to be passed to React Native component.    |

Examples:

```swift
  ReactNativeView(moduleName: "ReactNative")
```

```swift
  ReactNativeView(moduleName: "ReactNative", initialProperties: ["score": 12])
```

Usage with SwiftUI navigation:

```swift
NavigationLink("Open React Native Screen") {
  ReactNativeView(moduleName: "ReactNative")
    .navigationBarHidden(true)
}
```

---

### Example

You can find an example app [here](../example/swift).


