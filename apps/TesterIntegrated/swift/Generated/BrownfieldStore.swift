import Brownie

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let brownfieldStore = try? JSONDecoder().decode(BrownfieldStore.self, from: jsonData)

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

import Foundation

// MARK: - BrownfieldStore
struct BrownfieldStore: Codable, Equatable {
    var counter: Double
    var user: User
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - User
struct User: Codable, Equatable {
    var name: String
}

extension BrownfieldStore: BrownieStoreProtocol {
  public static let storeName = "BrownfieldStore"
}
