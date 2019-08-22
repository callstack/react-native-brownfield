## Objective-C

React Native Brownfield provides first-class support for Objective-C.

### Linking

The library is meant to work with [auto linking](https://github.com/react-native-community/cli/blob/master/docs/autolinking.md). In case you can't use this feature, please check out the following options:

<details>
<summary>react-native link</summary>
Run the following command in your terminal:

```bash
  react-native link @react-native-community/slider
```
</details>

<details>
<summary>CocoaPods</summary>
Add the following line to your `Podfile`:

```ruby
  pod 'ReactNativeBrownfield', :path => '../node_modules/@callstack/react-native-brownfield/ios'
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

```objc
  #import <ReactNativeBrownfield/ReactNativeBrownfield.h>
```

---

**Statics:**

`shared`

A singleton that keeps an instance of ReactNativeBrownfield object.

Examples:

```objc
  [ReactNativeBrownfield shared]
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
| onBundleLoaded          | No       | void(^)(void) | Callback invoked after JS bundle is fully loaded.     |
| launchOptions           | No       | NSDictionary  | Launch options, typically passed from AppDelegate.    |

Examples:

```objc
    [[ReactNativeBrownfield shared] startReactNative];
```

```objc
    [[ReactNativeBrownfield shared] startReactNative:^(void){
        NSLog(@"React Native started");
    }];
```

```objc
    [[ReactNativeBrownfield shared] startReactNative:^(void){
        NSLog(@"React Native started");
    }, launchOptions];
```

---

#### ReactNativeViewController

A view controller that's rendering `RCTRootView` within its bounds. It automatically uses an instance of a bridge created in `startReactNative` method. It works well with exposed JavaScript method. It's the simplest way to embed React Native into your navigation stack.

You can import it from:

```objc
  #import <ReactNativeBrownfield/ReactNativeViewController.h>
```

---

**Constructors:**

`initWithModuleName andInitialProperties`

| Param              | Required  | Type          | Description                                                   |
| ------------------ | --------- | ------------- | ------------------------------------------------------------- |
| moduleName         | Yes       | NSString      | Name of React Native component registered to `AppRegistry`.   |
| initialProperties  | No        | NSString      | Initial properties to be passed to React Native component.    |

Examples:

```objc
  [[ReactNativeViewController alloc] initWithModuleName:@"ReactNative"]
```

```objc
  [[ReactNativeViewController alloc] initWithModuleName:@"ReactNative" andInitialProperties:@{@"score": 12}]
```

---

### Linking

You can find an example app [here](../example/objc).


