---
'@callstack/react-native-brownfield': patch
---

Force `BUILD_LIBRARY_FOR_DISTRIBUTION` / `SWIFT_EMIT_MODULE_INTERFACE` on the CocoaPods ReactBrownfield, Brownie and BrownfieldNavigation targets so Release builds emit `.swiftinterface` files and `xcodebuild -create-xcframework` (brownfield `package:ios`) can merge slices.
