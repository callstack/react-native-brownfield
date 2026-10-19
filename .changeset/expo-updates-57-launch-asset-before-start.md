---
'@callstack/react-native-brownfield': patch
---

Fix an iOS crash with expo-updates 57 when updates are enabled. The Expo runtime no longer asks the Updates controller for its launch asset before the controller has started.
