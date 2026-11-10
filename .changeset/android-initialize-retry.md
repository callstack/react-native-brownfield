---
'@callstack/react-native-brownfield': patch
---

Android: `ReactNativeBrownfield.initialize` can now be called again after it throws. Before, a failure while loading native libraries or creating the `ReactHost` left it marked as initialized, so the next call returned without error and `ReactNativeBrownfield.shared` was never set.
