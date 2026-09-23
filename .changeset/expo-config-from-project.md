---
'@callstack/brownfield-cli': patch
---

Load the Expo config with the project's own `expo/config` instead of the CLI's bundled `@expo/config`, so config plugins resolve the same way as in `expo prebuild`. Fixes `package:android` / `package:ios` failing on Expo SDK 58 with `INVALID_PLUGIN_IMPORT` for packages like `expo-image` that no longer expose `app.plugin.js` through their `exports` map.
