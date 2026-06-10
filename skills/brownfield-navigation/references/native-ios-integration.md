# Native Integration (iOS)

## Implement delegate

- Conform to generated `BrownfieldNavigationDelegate`
- Route each generated method to intended UIKit/SwiftUI destination
- Execute presentation on main thread

## Register delegate with lifecycle ownership

- Call:
  - `BrownfieldNavigationManager.shared.setDelegate(navigationDelegate: ...)`
  - `BrownfieldNavigationManager.shared.clearDelegate()`
- Register before RN screens that call Brownfield navigation are shown
- Keep a strong delegate reference while this host owns Brownfield navigation
- Clear the delegate when this host stops owning navigation
- Do not keep the delegate registered for the full app lifetime by default; reassign ownership when another native host takes over
- In SwiftUI apps, prefer `scenePhase` for foreground ownership; in UIKit scene-based apps, prefer `UISceneDelegate`
- Do not rely on `UIApplicationDelegate` active/resign callbacks as the only ownership signal in SwiftUI
- `BrownfieldNavigationManager.shared.getDelegate()` still traps if no delegate is registered

## Minimal pattern

```swift
final class AppDelegate: NSObject, UIApplicationDelegate {
  private let navigationDelegate = AppNavigationDelegate()

  func registerNavigationDelegate() {
    BrownfieldNavigationManager.shared.setDelegate(
      navigationDelegate: navigationDelegate
    )
  }

  func clearNavigationDelegate() {
    BrownfieldNavigationManager.shared.clearDelegate()
  }
}

struct RootContentView: View {
  @Environment(\.scenePhase) private var scenePhase

  let appDelegate: AppDelegate

  var body: some View {
    ContentView()
      .onAppear {
        syncNavigationDelegate(for: scenePhase)
      }
      .onChange(of: scenePhase) { newPhase in
        syncNavigationDelegate(for: newPhase)
      }
  }

  private func syncNavigationDelegate(for phase: ScenePhase) {
    switch phase {
    case .active:
      appDelegate.registerNavigationDelegate()
    case .inactive, .background:
      appDelegate.clearNavigationDelegate()
    @unknown default:
      appDelegate.clearNavigationDelegate()
    }
  }
}

final class AppNavigationDelegate: BrownfieldNavigationDelegate {
  func openNativeProfile(userId: String) {
    DispatchQueue.main.async {
      // present native screen
    }
  }
}
```
