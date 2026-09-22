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
    .library(
      name: "BrownfieldNavigationSupport",
      targets: ["BrownfieldNavigationSupport"]
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
    .target(
      name: "BrownfieldNavigationSupport",
      path: "Sources/BrownfieldNavigationSupport"
    ),
    .testTarget(
      name: "BrownfieldNavigationSupportTests",
      dependencies: ["BrownfieldNavigationSupport"],
      path: "Tests/BrownfieldNavigationSupportTests"
    ),
  ]
)
