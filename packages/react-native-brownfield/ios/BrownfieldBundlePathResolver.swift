import Foundation

enum BrownfieldBundlePathResolver {
  enum Error: Swift.Error {
    case invalidBundlePath(String)
  }

  static func resourceComponents(from bundlePath: String) throws -> (
    resourceName: String,
    fileExtension: String
  ) {
    let fileExtension = (bundlePath as NSString).pathExtension
    let resourceName = (bundlePath as NSString).deletingPathExtension

    guard !fileExtension.isEmpty, !resourceName.isEmpty else {
      throw Error.invalidBundlePath(bundlePath)
    }

    return (resourceName, fileExtension)
  }
}
