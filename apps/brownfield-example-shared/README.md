# @callstack/brownfield-example-shared

Shared React Native UI used by the brownfield demo apps (`RNApp` and `RockApp`).

It exposes a small React Navigation–based UI that exercises the features of
`@callstack/react-native-brownfield`, `@callstack/brownfield-navigation`, and
`@callstack/brownie`:

- `App` – the root component with `NavigationContainer` and a single `HomeScreen`
  in a native stack.
- `HomeScreen` – a screen demonstrating `postMessage`/`onMessage`, native
  back-gesture handling, `popToNative`, brownfield navigation, and a shared
  Brownie store counter.
- `Counter` – uses `useStore('BrownfieldStore', ...)` from Brownie.
- `NativeOsVersionLabelContext` / `useNativeOsVersionLabel` – context to thread
  the host OS version label from the native side into RN.
- `getRandomTheme` / `Theme` – small helper to randomize a per-screen theme.

Consumers are expected to provide their own `BrownfieldStore.brownie.ts` (used
by Brownie codegen) and `brownfield.navigation.ts` (used by
`brownfield-navigation` codegen). This package only references the runtime
APIs, not the codegen entry files.
