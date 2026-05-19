// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let userType = try? JSONDecoder().decode(UserType.self, from: jsonData)

import Foundation

// MARK: - UserType
@objcMembers public class UserType: NSObject, Codable {
    public var avatar: Avatar?
    public var email: String?
    public var flags: [String]
    public var id: String
    public var ids: [String]?
    public var name: String

    public init(avatar: Avatar?, email: String?, flags: [String], id: String, ids: [String]?, name: String) {
        self.avatar = avatar
        self.email = email
        self.flags = flags
        self.id = id
        self.ids = ids
        self.name = name
    }
}

// MARK: - Avatar
@objcMembers public class Avatar: NSObject, Codable {
    public var url: String

    public init(url: String) {
        self.url = url
    }
}


@objc public extension UserType {
    static func fromDictionary(_ value: NSDictionary) -> UserType {
        return UserType(avatar: (value["avatar"] as? NSDictionary).map(Avatar.fromDictionary), email: value["email"] as? String, flags: value["flags"] as! [String], id: value["id"] as! String, ids: value["ids"] as? [String], name: value["name"] as! String)
    }
}

@objc public extension Avatar {
    static func fromDictionary(_ value: NSDictionary) -> Avatar {
        return Avatar(url: value["url"] as! String)
    }
}