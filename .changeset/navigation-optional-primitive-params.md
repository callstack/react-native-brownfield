---
'@callstack/brownfield-cli': patch
---

`brownfield navigation:codegen` now generates `NSNumber` for optional `number` and `boolean` method parameters on iOS. Previously, the generated Swift delegate used `Double?` and `Bool?`, which can't be represented in an `@objc` protocol, so the iOS build failed.
