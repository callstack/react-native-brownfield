require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |spec|
  spec.name         = "Brownie"
  spec.version      = package['version']
  spec.summary      = package['description']
  spec.license      = package['license']

  spec.authors      = package['author']
  spec.homepage     = package['homepage']
  spec.platform     = :ios, "14.0"

  spec.module_name = "Brownie"
  spec.source       = { :git => "git@github.com:callstack/react-native-brownfield.git", :tag => "#{spec.version}" }
  spec.source_files = [
    "ios/**/*.{h,m,mm,swift}",
    "cpp/**/*.{h,cpp}"
  ]
  spec.private_header_files = "cpp/**/*.h"

  spec.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'OTHER_SWIFT_FLAGS' => "-enable-experimental-feature AccessLevelOnImport",
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'HEADER_SEARCH_PATHS' => '$(inherited) "${PODS_ROOT}/boost" "${PODS_ROOT}/RCT-Folly" "${PODS_TARGET_SRCROOT}/cpp"'
  }

  install_modules_dependencies(spec)
end
