import Foundation

enum BrownfieldBundlePathResolver {
  static func resourceComponents(from bundlePath: String) -> (resourceName: String, fileExtension: String) {
    let resourceURLComponents = bundlePath.components(separatedBy: ".")
    let withoutLast = resourceURLComponents.dropLast()
    let resourceName = withoutLast.joined(separator: ".")
    let fileExtension = resourceURLComponents.last ?? ""
    return (resourceName, fileExtension)
  }
}
