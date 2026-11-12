---
'@callstack/react-native-brownfield': patch
---

Deliver deep links and universal links that arrive while the app is running in iOS hosts that declare `UISceneConfigurations`. React Native 0.88 ignores `RCTLinkingManager`'s app delegate entry points in such apps, so the `Linking` `url` event never fired.
