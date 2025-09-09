import Brownie

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let brownfieldStore = try? JSONDecoder().decode(BrownfieldStore.self, from: jsonData)

import Foundation

// MARK: - BrownfieldStore
struct BrownfieldStore: Codable {
    var counter: Double
    var hasError, isLoading: Bool
    var user: User
}

// MARK: - User
struct User: Codable {
    var name: String
}

extension BrownfieldStore: BrownieStoreProtocol {
  public static let storeName = "BrownfieldStore"
}
