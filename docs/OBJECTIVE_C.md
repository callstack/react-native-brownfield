## Objective-C

React Native Brownfield provides first-class support for Objective-C.

### API Reference

#### ReactNativeBrownfield

You can import the object from:

```objc
#import <ReactNativeBrownfield/ReactNativeBrownfield.h>
```

---

**Statics:**

`shared`

A singleton that keeps an instance of `ReactNativeBrownfield` object.

Examples:

```objc
[ReactNativeBrownfield shared]
```

---

**Properties:**

| Property                   | Type                    | Default        | Description                                        |
| -------------------------- | ----------------------- | -------------- | -------------------------------------------------- |
| `entryFile`                | `NSString`              | `index`        | Path to JavaScript root.                           |
| `fallbackResource`         | `NSString`              | `nil`          | Path to bundle fallback resource.                  |
| `bundlePath`               | `NSString`              | `main.jsbundle`| Path to bundle fallback resource.                  |

---

**Methods:**

`startReactNative`

Starts React Native, produces an instance of React Native. You can use it to initialize React Native in your app.

Params:

| Param                   | Required | Type              | Description                                           |
| ----------------------- | -------- | ----------------- | ----------------------------------------------------- |
| `onBundleLoaded`        | No       | `void(^)(void)`   | Callback invoked after JS bundle is fully loaded.     |
| `launchOptions`         | No       | `NSDictionary`    | Launch options, typically passed from AppDelegate.    |

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

`view`

Creates a React Native view for the specified module name.

Params:

| Param                   | Required | Type              | Description                                           |
| ----------------------- | -------- | ----------------- | ----------------------------------------------------- |
| `moduleName`            | Yes      | `NSString`        | Name of React Native component registered to `AppRegistry`. |
| `initialProps`          | No       | `NSDictionary`    | Initial properties to be passed to React Native component. |
| `launchOptions`         | No       | `NSDictionary`    | Launch options, typically passed from AppDelegate. |

Examples:

```objc
UIView *view = [[ReactNativeBrownfield shared] viewWithModuleName:@"ReactNative" initialProps:@{@"score": @12}];
```

---

#### `ReactNativeViewController`

A view controller that's rendering React Native view within its bounds. It automatically uses an instance of a factory created in `startReactNative` method. It works well with exposed JavaScript module. It's the simplest way to embed React Native into your navigation stack.

You can import it from:

```objc
#import <ReactNativeBrownfield/ReactNativeViewController.h>
```

---

**Constructors:**

`[ReactNativeViewController initWithModuleName:moduleName andInitialProperties:initialProps]`

| Param                 | Required  | Type            | Description                                                   |
| --------------------- | --------- | --------------- | ------------------------------------------------------------- |
| `moduleName`          | Yes       | `NSString`      | Name of React Native component registered to `AppRegistry`.   |
| `initialProperties`   | No        | `NSDictionary`  | Initial properties to be passed to React Native component.    |

Examples:

```objc
[[ReactNativeViewController alloc] initWithModuleName:@"ReactNative"]
```

```objc
[[ReactNativeViewController alloc] initWithModuleName:@"ReactNative" andInitialProperties:@{@"score": @12}]
```

