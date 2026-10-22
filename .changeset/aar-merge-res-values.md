---
'@callstack/react-native-brownfield': patch
---

fix: keep the resources of every library embedded in the Android AAR; previously only one library's `res/values` survived and host apps failed at resource linking. As in a regular app, the module's own `res` and `resValue`s win over a library's, and when two libraries define the same resource the first one wins (previously the last one won for files such as drawables)
