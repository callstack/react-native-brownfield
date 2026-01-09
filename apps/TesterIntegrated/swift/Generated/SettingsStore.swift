import Brownie

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let settingsStore = try? JSONDecoder().decode(SettingsStore.self, from: jsonData)

import Foundation

// MARK: - SettingsStore
struct SettingsStore: Codable {
    var notificationsEnabled, privacyMode: Bool
    var theme: Theme
}

enum Theme: String, Codable {
    case dark = "dark"
    case light = "light"
}

extension SettingsStore: BrownieStoreProtocol {
  public static let storeName = "SettingsStore"
}
