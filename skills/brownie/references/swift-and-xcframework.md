# Brownie Swift Usage and XCFramework Packaging

## Discoverability triggers

- "register brownie store in iOS app startup"
- "UseStore swiftui brownie"
- "brownie uikit subscribe storemanager"
- "Brownie.xcframework embed and sign"

## Scope

In scope:
- Registering stores in iOS app startup.
- SwiftUI `@UseStore` patterns and UIKit subscription patterns.
- XCFramework packaging output and embedding flow for Brownie-enabled modules.
- Common packaging and runtime wiring checks.

Out of scope:
- Initial installation and first setup sequence. For that, read [`getting-started.md`](getting-started.md) in this folder.
- Android integration specifics. For that, read [`android-usage.md`](android-usage.md) in this folder.
- TypeScript store schema and codegen troubleshooting. For that, read [`store-definition-and-codegen.md`](store-definition-and-codegen.md) in this folder.
- React Native hook-level usage patterns. For that, read [`typescript-usage.md`](typescript-usage.md) in this folder.

## Procedure

1. Package iOS artifacts
   - Run `npx brownfield package:ios --scheme YourScheme --configuration Release`.
   - Locate generated XCFrameworks under `ios/.brownfield/package/build/`
   - Confirm output includes:
     - `<scheme>.xcframework`
     - `Brownie.xcframework`
     - `ReactBrownfield.xcframework`
     - `hermesvm.xcframework` (or `hermes.xcframework` on older RN)

2. Embed frameworks into native app
   - Add all generated frameworks to the Xcode project.
   - Set each to `Embed & Sign` in target settings.

3. Register stores at startup
   - Create initial typed state.
   - Call `YourStore.register(initialState)` during app initialization before usage.

4. Apply SwiftUI usage pattern
   - Use `@UseStore(\Store.field)` for reactive selected slices.
   - Update with projected binding (`$value`) and `set` helper when needed.

5. Apply UIKit usage pattern
   - Resolve typed store from `StoreManager`.
   - Use `subscribe` and store the cancellation closure.
   - Unsubscribe on deinit or view lifecycle teardown.

6. Troubleshoot common iOS integration failures
   - Missing symbols/import failures: verify all frameworks are embedded and signed.
   - No updates in UI: confirm store registration occurred before first read.
   - Old schema behavior: rerun codegen/package and replace embedded frameworks.
   - `No such module 'Brownie'`: verify `Brownie.xcframework` is in the target and set to `Embed & Sign`.

## Compact Swift examples

```swift
import Brownie
import SwiftUI

struct CounterView: View {
  @UseStore(\AppStore.counter) var counter

  var body: some View {
    Button("Increment") {
      $counter.set { $0 + 1 }
    }
  }
}
```

```swift
import Brownie

let store = StoreManager.get(key: AppStore.storeName, as: AppStore.self)
let cancel = store?.subscribe(\.counter) { value in
  print("Counter: \(value)")
}
```

## Quick reference

- iOS package command: `npx brownfield package:ios --scheme YourScheme --configuration Release`
- Required frameworks to embed:
  - `<scheme>.xcframework`
  - `Brownie.xcframework`
  - `ReactBrownfield.xcframework`
  - `hermesvm.xcframework` (or `hermes.xcframework`)
- Swift APIs:
  - `YourStore.register(initialState)`
  - `@UseStore(\YourStore.someField)`
  - `StoreManager.get(key:as:)`
  - `store.subscribe(...)`
- Error cues this guide handles:
  - `No such module 'Brownie'`
  - Store reads return nil due to missing registration
  - UI never re-renders because subscription or selector path is incorrect
