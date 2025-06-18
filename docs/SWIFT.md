## Swift

React Native Brownfield provides first-class support for Swift.

### API Reference

#### `ReactNativeBrownfield`

You can import the object from:

```swift
import ReactBrownfield
```

---

**Statics:**

`shared`

A singleton that keeps an instance of `ReactNativeBrownfield` object.

Examples:

```swift
ReactNativeBrownfield.shared
```

---

**Properties:**

| Property           | Type      | Default         | Description                                               |
| ------------------ | --------- | --------------- | --------------------------------------------------------- |
| `entryFile`        | `String`  | `index`         | Path to JavaScript root.                                  |
| `fallbackResource` | `String?` | `nil`           | Path to bundle fallback resource.                         |
| `bundlePath`       | `String`  | `main.jsbundle` | Path to bundle fallback resource.                         |
| `bundle`           | `Bundle`  | `Bundle.main`   | Bundle instance to lookup the JavaScript bundle resource. |

---

**Methods:**

`startReactNative`

Starts React Native. You can use it to initialize React Native in your app.

Params:

| Param            | Required | Type                  | Description                                        |
| ---------------- | -------- | --------------------- | -------------------------------------------------- |
| `onBundleLoaded` | No       | `(() -> Void)?`       | Callback invoked after JS bundle is fully loaded.  |
| `launchOptions`  | No       | `[AnyHashable: Any]?` | Launch options, typically passed from AppDelegate. |

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

`view`

Creates a React Native view for the specified module name.

Params:

| Param           | Required | Type                  | Description                                                 |
| --------------- | -------- | --------------------- | ----------------------------------------------------------- |
| `moduleName`    | Yes      | `String`              | Name of React Native component registered to `AppRegistry`. |
| `initialProps`  | No       | `[AnyHashable: Any]?` | Initial properties to be passed to React Native component.  |
| `launchOptions` | No       | `[AnyHashable: Any]?` | Launch options, typically passed from AppDelegate.          |

Examples:

```swift
let view = ReactNativeBrownfield.shared.view(
  moduleName: "ReactNative",
  initialProps: ["score": 12]
)
```

---

#### Initialization Approaches

React Native Brownfield supports two main approaches for initialization:

**1. UIKit AppDelegate Approach (Traditional)**

```swift
import UIKit
import ReactBrownfield

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

To present a React Native view in a UIKit app, use `ReactNativeViewController`:

```swift
import UIKit
import ReactBrownfield

class ViewController: UIViewController {
  @IBAction func openReactNativeScreen(_ sender: UIButton) {
    let reactNativeVC = ReactNativeViewController(moduleName: "ReactNative")

    present(reactNativeVC, animated: true)
  }
}
```

**2. SwiftUI App Approach (Modern)**

```swift
import SwiftUI
import ReactBrownfield

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

To display React Native views in SwiftUI, use the provided `ReactNativeView` component:

```swift
import SwiftUI
import ReactBrownfield

struct ContentView: View {
  var body: some View {
    NavigationView {
      VStack {
        Text("Welcome to the Native App")
          .padding()

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

Both approaches achieve the same result - initializing React Native when your app launches and presenting React Native screens when needed. Choose the approach that best fits your app architecture.

---

#### `ReactNativeViewController`

A view controller that's rendering React Native view within its bounds. It automatically uses an instance of a factory created in `startReactNative` method. It works well with exposed JavaScript module. It's the simplest way to embed React Native into your navigation stack.

You can import it from:

```swift
import ReactBrownfield
```

---

**Constructors:**

`ReactNativeViewController(moduleName: moduleName, initialProperties: initialProperties)`

| Param               | Required | Type             | Description                                                 |
| ------------------- | -------- | ---------------- | ----------------------------------------------------------- |
| `moduleName`        | Yes      | `String`         | Name of React Native component registered to `AppRegistry`. |
| `initialProperties` | No       | `[String: Any]?` | Initial properties to be passed to React Native component.  |

Examples:

```swift
ReactNativeViewController(moduleName: "ReactNative")
```

```swift
ReactNativeViewController(moduleName: "ReactNative", initialProperties: ["score": 12])
```

---

#### `ReactNativeView`

A SwiftUI view that wraps the `ReactNativeViewController`, making it easy to integrate React Native into SwiftUI navigation flows. It automatically handles navigation events like "pop to native" from React Native.

You can import it from:

```swift
import ReactBrownfield
```

---

**Constructors:**

`ReactNativeView(moduleName: moduleName, initialProperties: initialProperties)`

| Param               | Required | Type            | Description                                                 |
| ------------------- | -------- | --------------- | ----------------------------------------------------------- |
| `moduleName`        | Yes      | `String`        | Name of React Native component registered to `AppRegistry`. |
| `initialProperties` | No       | `[String: Any]` | Initial properties to be passed to React Native component.  |

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
