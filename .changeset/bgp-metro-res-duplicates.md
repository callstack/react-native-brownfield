---
'@callstack/react-native-brownfield': patch
---

fix: the AAR build no longer fails with duplicate resources when an embedded library ships the same drawables Metro generates for the app's bundle. Metro's copy wins.
