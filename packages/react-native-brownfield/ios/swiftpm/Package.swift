// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "BrownfieldBundleSupport",
  platforms: [
    .macOS(.v13),
  ],
  products: [
    .library(
      name: "BrownfieldBundleSupport",
      targets: ["BrownfieldBundleSupport"]
    ),
  ],
  targets: [
    .target(
      name: "BrownfieldBundleSupport",
      path: "Sources/BrownfieldBundleSupport"
    ),
    .testTarget(
      name: "BrownfieldBundleSupportTests",
      dependencies: ["BrownfieldBundleSupport"],
      path: "Tests/BrownfieldBundleSupportTests"
    ),
  ]
)
