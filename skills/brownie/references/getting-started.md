# Brownie Getting Started

## Discoverability triggers

- "install @callstack/brownie"
- "set up Brownie in brownfield app"
- "first Brownie store setup"
- "how to start Brownie on iOS or Android"

## Scope

In scope:
- Prerequisites and initial installation.
- First store definition and app entry import.
- Platform handoff sequence for iOS and Android setup.
- First-pass verification that state sync works.

Out of scope:
- Deep schema modeling details and codegen internals. For that, read [`store-definition-and-codegen.md`](store-definition-and-codegen.md) in this folder.
- Advanced JS runtime patterns and low-level TypeScript APIs. For that, read [`typescript-usage.md`](typescript-usage.md) in this folder.
- Platform-specific deep dives. For Android details, read [`android-usage.md`](android-usage.md). For iOS details, read [`swift-and-xcframework.md`](swift-and-xcframework.md) in this folder.

## Procedure

1. Confirm prerequisites
   - React Native brownfield setup is already complete.
   - `@callstack/react-native-brownfield` is installed.
   - Native host app(s) exist for iOS and/or Android.

2. Install Brownie in the React Native app
   - Run `npm install @callstack/brownie`.

3. Define the first store
   - Create a file ending in `.brownie.ts`.
   - Declare an interface extending `BrownieStore`.
   - Add module augmentation for `BrownieStores`.

4. Ensure augmentation is loaded
   - Import the `.brownie.ts` file from the app entry (`App.tsx` or `index.js`).

5. Add first TypeScript usage
   - Use `useStore('StoreName', selector)` in a component.
   - Perform one update via object or callback updater.

6. Platform handoff
   - iOS path:
     1. Run `npx brownfield package:ios --scheme YourScheme --configuration Release`.
     2. Confirm package output contains your module XCFramework plus `Brownie.xcframework`, `ReactBrownfield.xcframework`, and Hermes (`hermesvm.xcframework` or `hermes.xcframework`).
     3. Embed generated frameworks as `Embed & Sign`.
     4. Register the store in app startup.
   - Android path:
     1. Configure `brownie` settings in `package.json` (`kotlin`, `kotlinPackageName`).
     2. Ensure Gson dependency exists in brownfield module or app.
     3. Run `npx brownfield package:android --module-name :YourModuleName --variant release`.
     4. Run `npx brownfield publish:android --module-name :YourModuleName`.
     5. Register store during startup with `registerStoreIfNeeded`.
   - Note: both `package:ios` and `package:android` run Brownie codegen as part of packaging.

7. Verify sync
   - Update state from React Native and confirm native UI observes updates.
   - Update from native and confirm React Native reflects changes.
   - If one side is stale after schema edits, rerun packaging/codegen and rebuild host apps.
   - Android runtime gate:
     - If launch fails with `ClassNotFoundException: com.google.gson.Gson`, add `implementation("com.google.code.gson:gson:<version>")` to brownfield module or host app and rebuild.

## Quick reference

- Install: `npm install @callstack/brownie`
- Store file pattern: `*.brownie.ts`
- Codegen/build entry points:
  - `npx brownfield codegen`
  - `npx brownfield package:ios --scheme YourScheme --configuration Release`
  - `npx brownfield package:android --module-name :YourModuleName --variant release`
  - `npx brownfield publish:android --module-name :YourModuleName`
- iOS packaging outputs (CLI docs):
  - `ios/.brownfield/package/build/` (or `ios/.brownfield/package/` in some setups)
- Error cues this guide handles first:
  - Store file exists but typed APIs are missing
  - Native setup done but store not registered at startup
  - First state update does not appear on one side
