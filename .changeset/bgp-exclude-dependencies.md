---
'@callstack/react-native-brownfield': minor
'@callstack/brownfield-cli': minor
---

feat: the published POM and `module.json` now follow the brownfield module's Gradle exclude rules (`configurations.all { exclude(...) }`). Before, the plugin re-added an excluded dependency when it injected the embedded libraries' dependencies, so the host app still resolved it. The excludes are also written onto every dependency the plugin injects, so the excluded library can't arrive through one of them. On Expo, list them in `android.excludeDependencies` (as `group:module` or `group`), which the config plugin writes into the generated module.
