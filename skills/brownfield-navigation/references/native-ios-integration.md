# Native Integration (iOS)

## Implement delegate

- Conform to generated `BrownfieldNavigationDelegate`
- Route each generated method to intended UIKit/SwiftUI destination
- Execute presentation on main thread

## Register delegate at startup

- Call:
  - `BrownfieldNavigationManager.shared.setDelegate(navigationDelegate: ...)`
- Register before RN screens that call Brownfield navigation are shown
- Keep a strong delegate reference for app lifetime

## Minimal pattern

```swift
final class AppNavigationDelegate: BrownfieldNavigationDelegate {
  func openNativeProfile(userId: String) {
    DispatchQueue.main.async {
      // present native screen
    }
  }
}

BrownfieldNavigationManager.shared.setDelegate(navigationDelegate: navigationDelegate)
```
