require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |spec|
  spec.name         = "ReactBrownfield"
  spec.version      = package['version']
  spec.summary      = package['description']
  spec.license      = package['license']

  spec.authors      = package['author']
  spec.homepage     = package['homepage']
  spec.platform     = :ios, "14.0"

  spec.module_name = "ReactBrownfield"
  spec.source       = { :git => "git@github.com:callstack/react-native-brownfield.git", :tag => "#{spec.version}" }
  spec.source_files  = "ios/**/*.{h,m,mm,swift}"
  spec.exclude_files = "ios/swiftpm/Package.swift", "ios/swiftpm/Tests/**/*"
  spec.pod_target_xcconfig = {
    # below: needed to build the XCFramework with `.swiftinterface` files, required by xcodebuild -create-xcframework to succeed
    'DEFINES_MODULE' => 'YES',
    'BUILD_LIBRARY_FOR_DISTRIBUTION' => 'YES',
    'SWIFT_EMIT_MODULE_INTERFACE' => 'YES',
    'OTHER_SWIFT_FLAGS' => "-enable-experimental-feature AccessLevelOnImport"
  }

  if ENV['RCT_USE_PREBUILT_RNCORE'] == '1'
    spec.dependency 'React-Core-prebuilt'
  end

  spec.dependency 'ReactAppDependencyProvider'
  spec.dependency 'React-RCTAppDelegate'

  if ENV['REACT_NATIVE_BROWNFIELD_USE_EXPO_HOST'] == '1'
    spec.dependency 'Expo'
    spec.dependency 'EXUpdates'
  end

  install_modules_dependencies(spec)
end
