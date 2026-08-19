---
"@callstack/react-native-brownfield": patch
"@callstack/brownie": patch
"@callstack/brownfield-navigation": patch
"brownfield": patch
"@callstack/brownfield-cli": patch
---

Fix npm publishing by upgrading to Changesets v3 (Yarn rewrites `workspace:` ranges on publish) and correcting package `repository` metadata required for npm provenance.
