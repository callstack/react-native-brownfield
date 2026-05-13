# Native Integration (Android)

## Implement delegate

- Implement generated `BrownfieldNavigationDelegate`
- Route each generated method to intended native destination
- Map params directly (for example through `Intent` extras)

## Register delegate at startup

- Call:
  - `BrownfieldNavigationManager.setDelegate(...)`
- Register in startup flow (for example `onCreate`)
- Ensure registration happens before RN calls

## Minimal pattern

```kotlin
class MainActivity : AppCompatActivity(), BrownfieldNavigationDelegate {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    BrownfieldNavigationManager.setDelegate(this)
  }

  override fun openNativeProfile(userId: String) {
    val intent = Intent(this, ProfileActivity::class.java).apply {
      putExtra("userId", userId)
    }
    startActivity(intent)
  }
}
```
