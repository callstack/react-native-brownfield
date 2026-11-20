---
'@callstack/react-native-brownfield': patch
---

iOS (Expo host): `application(_:open:options:)` now always forwards the URL to React Native linking before asking the Expo app delegate subscribers, so a subscriber that returns `true` (for example `expo-dev-launcher` in a debug build) no longer prevents the JS `Linking` `url` event. This matches the existing `application(_:continue:restorationHandler:)` order.
