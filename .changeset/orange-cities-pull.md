---
'@callstack/react-native-brownfield': patch
---

fixes #457, android back callbacks survived RN fragment view destruction, retaining delegates and intercepting back presses after re-entry
