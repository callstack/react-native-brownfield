---
'@callstack/react-native-brownfield': minor
---

Add `preloadBundle` to `startReactNative` on iOS. Without a preload, `startReactNative` only makes the factory, and React Native loads the JavaScript bundle when it creates the first React Native view. `startReactNative(launchOptions:preloadBundle:onBundleLoaded:)` moves that work to the app launch: the call starts the React Host, and React Native evaluates the bundle on the JavaScript thread, in parallel with the remainder of the app launch. On Android, `ReactNativeBrownfield.initialize` does the same operation. This shape of `startReactNative` also takes the launch options for the React Host.

`onBundleLoaded` now runs on the main thread, and not on the JavaScript thread. A callback that you add after React Native loaded the bundle runs in the next turn of the main run loop.
