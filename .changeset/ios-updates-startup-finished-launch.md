---
'@callstack/react-native-brownfield': patch
---

Fix the iOS Expo Updates startup gate waiting forever when the host app started expo-updates itself and its launch had already finished (most visibly an emergency launch with no embedded bundle), or when the launch finished while the gate was registering its delegate.
