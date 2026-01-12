import Brownie

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let settingsStore = try? JSONDecoder().decode(SettingsStore.self, from: jsonData)

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

import Foundation

// MARK: - SettingsStore
struct SettingsStore: Codable, Equatable {
    var notificationsEnabled, privacyMode: Bool
    var theme: Theme
}

enum Theme: String, Codable, Equatable {
    case dark = "dark"
    case light = "light"
}

extension SettingsStore: BrownieStoreProtocol {
  public static let storeName = "SettingsStore"
}
