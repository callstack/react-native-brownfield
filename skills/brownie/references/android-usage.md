# Brownie Android Usage

## Discoverability triggers

- "registerStoreIfNeeded brownie"
- "Brownie Android setup package.json kotlin path"
- "Brownie custom serializer kotlin"
- "brownfield package android brownie publish"

## Scope

In scope:
- Android-side store registration lifecycle.
- Brownie Android package configuration and Gson dependency requirements.
- Easy path and advanced serializer options in Kotlin.
- Packaging and publish flow for AAR distribution.

Out of scope:
- Initial installation and first setup checklist. For that, read [`getting-started.md`](getting-started.md) in this folder.
- Store schema authoring and codegen file design. For that, read [`store-definition-and-codegen.md`](store-definition-and-codegen.md) in this folder.
- React Native hook-level patterns. For that, read [`typescript-usage.md`](typescript-usage.md) in this folder.
- iOS Swift and XCFramework guidance. For that, read [`swift-and-xcframework.md`](swift-and-xcframework.md) in this folder.

## Procedure

1. Confirm Android configuration
   - `package.json` includes a `brownie` block with:
     - `kotlin` output directory
     - `kotlinPackageName`

2. Ensure serializer dependency strategy
   - Brownie Android default serializer path requires Gson at runtime.
   - Hard requirement: do not complete integration unless `com.google.code.gson:gson` is present in the brownfield module or native app dependency graph.

3. Generate/build/publish artifacts
   - Build AAR with:
     - `npx brownfield package:android --module-name :YourModuleName --variant release`
   - Publish to local Maven with:
     - `npx brownfield publish:android --module-name :YourModuleName`
   - `package:android` also runs Brownie codegen before packaging.

4. Register store at startup
   - Use `registerStoreIfNeeded` once during startup to avoid duplicate registration.
   - Keep registration before native UI or JS flow assumes store availability.
   - `registerStoreIfNeeded` returns `null` if the store key is already registered.

5. Access and update typed store
   - Retrieve with `StoreManager.shared.store<T>(STORE_NAME)`.
   - Read from `store.state`, update via `store.set { ... }`, observe via `store.subscribe(...)`.

6. Use advanced serializers only when required
   - Use `brownieStoreDefinition(..., serializer = ...)` or `encode`/`decode` lambdas.
   - Keep decode/encode logic deterministic and version aware for backward compatibility.

## Compact Kotlin example

```kotlin
import com.callstack.brownie.StoreManager
import com.callstack.brownie.registerStoreIfNeeded
import com.callstack.brownie.store
import com.rnapp.brownfieldlib.AppStore

registerStoreIfNeeded(storeName = AppStore.STORE_NAME) {
  AppStore(counter = 0.0)
}

val store = StoreManager.shared.store<AppStore>(AppStore.STORE_NAME)
store?.set { state -> state.copy(counter = state.counter + 1) }
```

## Quick reference

- Startup registration: `registerStoreIfNeeded(storeName) { initialState }`
- Store lookup: `StoreManager.shared.store<T>(STORE_NAME)`
- Required runtime dependency: `com.google.code.gson:gson`
- Packaging:
  - `npx brownfield package:android --module-name :YourModuleName --variant release`
  - `npx brownfield publish:android --module-name :YourModuleName`
- Error cues this guide handles:
  - Store not found due to missing registration
  - `ClassNotFoundException: com.google.gson.Gson` due to missing Gson dependency
  - Decode/encode issues in custom serializer path
  - Generated classes not found due to wrong `kotlinPackageName` or output path
