---
'@callstack/brownfield-cli': minor
---

Add `--add-spm-package` to `brownfield package:ios` so packaging can also generate a local Swift Package Manager wrapper around the produced XCFrameworks, including a generated `Package.swift`, `README.md`, and Xcode integration instructions. Fail fast when Debug packaging cannot resolve the app framework name while local SPM output is requested.
