---
'@callstack/react-native-brownfield': minor
---

fix: pick the right `.so` files for the Android AAR. With `useStrippedSoFiles = false`, the AAR now has `libappmodules.so` and `libreact_codegen_*.so`. Before this fix, those libs were missing and host apps crashed. The AAR also stops embedding the `.so` files of Maven dependencies. The host already gets those through the POM, so its build no longer fails with `2 files found with path 'lib/<abi>/<name>.so'`. If your app module builds or ships a `.so` of its own, list it in `reactBrownfield.dynamicLibs`, which is back. The build lists the `.so` files it left out in `<brownfield module>/build/reports/brownfield/<variant>/skipped-so.txt`. After upgrading, check that file: it lists the `.so` files that used to be in the AAR and now aren't.
