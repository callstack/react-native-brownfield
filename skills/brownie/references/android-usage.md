# Brownie Android Usage

## Minimum prerequisites

- `package.json` has `brownie.kotlin` and `brownie.kotlinPackageName`.
- Gson is available in native dependencies: `com.google.code.gson:gson`.
- Generated Kotlin store types already exist.

## Exact steps

1. Register the store once at startup with `registerStoreIfNeeded`.
2. Read/update the typed store using `StoreManager.shared.store<T>(STORE_NAME)`.
3. Build/publish artifacts when needed:
   - `npx brownfield package:android --module-name :YourModuleName --variant release`
   - `npx brownfield publish:android --module-name :YourModuleName`

## Verification command/API

- Required API: `registerStoreIfNeeded(storeName) { initialState }`
- Success signal: `StoreManager.shared.store<T>(STORE_NAME)` returns a non-null store and updates propagate.

## One short example

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
