---
'@callstack/react-native-brownfield': patch
---

`ReactNativeBrownfield.onMessage` no longer calls the callback a second time, with the raw message text, when the callback throws. The error now propagates instead of being swallowed.
