import Brownie

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let brownfieldStore = try? JSONDecoder().decode(BrownfieldStore.self, from: jsonData)

import Foundation

// MARK: - BrownfieldStore
struct BrownfieldStore: Codable, Equatable {
    var counter: Double
    var user: User
}

// MARK: - User
struct User: Codable, Equatable {
    var name: String
}

extension BrownfieldStore: BrownieStoreProtocol {
  public static let storeName = "BrownfieldStore"
}
