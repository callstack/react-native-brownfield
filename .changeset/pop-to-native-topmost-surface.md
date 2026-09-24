---
'@callstack/react-native-brownfield': patch
---

Fix `popToNative()` on iOS closing every React Native screen instead of only the topmost one.

`popToNative()` is delivered as an app-wide notification, so every live React Native surface acted on it — including surfaces buried under other screens, and each surface acted twice when hosted by SwiftUI. In a stack such as RN → native → RN, a single call tore down the whole navigation stack, taking native screens with it.

A React Native surface now acts only when it is the topmost one on screen, and only once per host.

Two consequences worth knowing about:

- When no React Native surface is on screen — for example one hidden behind a full-screen native modal — `popToNative()` is now a no-op instead of popping the hidden screen. It logs when this happens.
- `popToNative()` no longer dismisses a modally presented native screen that merely *contains* a React Native surface. Only a surface that owns a navigation stack entry pops.
