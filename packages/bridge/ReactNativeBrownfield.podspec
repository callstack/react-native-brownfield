require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |spec|
  spec.name         = "ReactNativeBrownfield"
  spec.version      = package['version']
  spec.summary      = package['description']
  spec.license      = package['license']

  spec.authors      = package['author']
  spec.homepage     = package['homepage']
  spec.platform     = :ios, "9.0"

  # s.source       = { :git => "git@github.com/michalchudziak/react-native-brownfield.git", :tag => "v#{s.version}" }
  spec.source       = { :path => "." }
  spec.source_files  = "ios/**/*.{h,m}"

  spec.dependency 'React'
end