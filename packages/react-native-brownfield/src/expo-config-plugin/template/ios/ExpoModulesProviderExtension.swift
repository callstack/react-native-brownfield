// Keeps the generated ExpoModulesProvider linked into the framework, so Expo
// modules register when the host app starts React Native.
extension ReactNativeBrownfield {
  public func ensureExpoModulesProvider() {
    let _ = ExpoModulesProvider()
  }
}
