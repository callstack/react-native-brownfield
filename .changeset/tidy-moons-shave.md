---
"@callstack/react-native-brownfield": patch
---

feat: allow extending the list of .so files kept out of the AAR

Adds a `reactBrownfield.ignoreEmbeddedLibs` option so a project can name additional native libraries that should not be embedded, next to the built-in `IGNORE_EMBEDDED_LIBS` list.
