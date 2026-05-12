# Brownie Swift Usage and XCFramework Packaging

Use this for iOS registration, Swift usage, and packaging.

## Package and embed

1. Run `npx brownfield package:ios --scheme YourScheme --configuration Release`
2. Add generated frameworks to Xcode and set `Embed & Sign`
3. Ensure `Brownie.xcframework`, `ReactBrownfield.xcframework`, and Hermes framework are included

## Startup registration

Call `YourStore.register(initialState)` before first read/subscription.

## SwiftUI / UIKit usage

```swift
import Brownie
import SwiftUI

struct CounterView: View {
  @UseStore(\AppStore.counter) var counter

  var body: some View {
    Button("Increment") { $counter.set { $0 + 1 } }
  }
}
```

UIKit: resolve via `StoreManager.get(key:as:)`, subscribe, and cancel on teardown.

## Common fixes

- `No such module 'Brownie'`: verify framework embed/sign.
- No UI updates: ensure store registered before use.
