---
'@callstack/react-native-brownfield': patch
---

Fix Expo iOS framework debug bundle packaging so Debug builds load from Metro when it is available and fall back to embedded bundles without dev-server-only runtime code.
