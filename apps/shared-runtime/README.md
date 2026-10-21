# Shared demo runtime

`@callstack/shared-runtime` contains code bundled into the demo apps:

- `userAlert`, root E2E-mode props, and stable test IDs used by the UI;
- the Brownie counter and the demo `useMarkFullyDisplayed` hook;
- Expo screens, components, styles, and their JS-referenced assets.

`RNApp`, `ExpoApp57`, and `ExpoApp58` depend on this private workspace. Test suites,
Jest setup, and Detox helpers live separately in `apps/shared-tests` and are only
development dependencies of the demo apps.

The Expo apps keep their entry registration, `require.context`, Router route
files, native configuration, stores, and app icons local. Route files import the
shared screens. The wrappers pass the SDK label and preserve the SDK 57-only
"Pop To Native" action.

React, React Native, and Expo libraries are peers supplied by each app. Do not
install a particular Expo or React Native version in this package: the demos
intentionally exercise different versions. Import vanilla helpers through their
individual exports so `RNApp` does not load Expo code.

After changing shared code, run `yarn test:apps` and lint the affected apps. Also
bundle both Expo apps and the vanilla app when changing imports or assets, since
Jest uses mocks for native modules. CI path filters include this package for all
three demos and both native hosts.

The demo TypeScript configs preserve workspace symlinks so shared source resolves
types from each consuming app, matching its runtime dependency versions.

For Expo type checks, first run the normal navigation codegen and build
`@callstack/brownfield-navigation`; its checked-in source is a placeholder. Then
run `yarn workspace @callstack/brownfield-example-expo-app-57 exec tsc --noEmit`
and the same command for `@callstack/brownfield-example-expo-app-58`. Do not
commit generated navigation bindings as part of this refactor.
