# Native Integration (Android)

## Implement delegate

- Implement generated `BrownfieldNavigationDelegate`
- Route each generated method to intended native destination
- Map params directly (for example through `Intent` extras)

## Register delegate with lifecycle ownership

- Call:
  - `BrownfieldNavigationManager.setDelegate(...)`
- `BrownfieldNavigationManager.clearDelegate()` is part of the public API and should be called when this host stops owning navigation
- Register in the lifecycle phase where this host becomes active (for example `onResume`)
- Clear in the matching release phase (for example `onPause`)
- Ensure registration happens before RN calls
- Do not keep a backgrounded or inactive `Activity` registered for the full app lifetime unless it is truly the only Brownfield navigation owner
- `BrownfieldNavigationManager.getDelegate()` still throws if no delegate is registered

## Minimal pattern

```kotlin
class MainActivity : AppCompatActivity(), BrownfieldNavigationDelegate {
  override fun onResume() {
    super.onResume()
    BrownfieldNavigationManager.setDelegate(this)
  }

  override fun onPause() {
    BrownfieldNavigationManager.clearDelegate()
    super.onPause()
  }

  override fun openNativeProfile(userId: String) {
    val intent = Intent(this, ProfileActivity::class.java).apply {
      putExtra("userId", userId)
    }
    startActivity(intent)
  }
}
```
