require 'json'
require 'shellwords'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |spec|
  spec.name         = "BrownfieldNavigation"
  spec.version      = package['version']
  spec.summary      = package['description']
  spec.license      = package['license']

  spec.authors      = package['author']
  spec.homepage     = package['homepage']
  spec.platform     = :ios, "14.0"

  spec.source       = { :git => "git@github.com:callstack/react-native-brownfield.git", :tag => "#{spec.version}" }

  navigation_ios_source_root = ENV['BROWNFIELD_NAVIGATION_IOS_SOURCE_ROOT']
  if navigation_ios_source_root && !navigation_ios_source_root.strip.empty?
    resolved_navigation_ios_source_root = File.expand_path(navigation_ios_source_root, __dir__)
    required_generated_source_files = [
      File.join(resolved_navigation_ios_source_root, 'NativeBrownfieldNavigation.mm'),
      File.join(resolved_navigation_ios_source_root, 'BrownfieldNavigationDelegate.swift'),
    ]

    missing_generated_source_files = required_generated_source_files.reject { |file| File.exist?(file) }
    if missing_generated_source_files.any?
      raise "[BrownfieldNavigation] Missing generated iOS source files for override: #{missing_generated_source_files.join(', ')}"
    end

    override_source_files = required_generated_source_files.dup
    optional_models_file = File.join(
      resolved_navigation_ios_source_root,
      'BrownfieldNavigationModels.swift'
    )
    override_source_files << optional_models_file if File.exist?(optional_models_file)

    override_source_dir = File.join(__dir__, 'ios', '.brownfield_navigation_override')
    linked_override_source_files = override_source_files.map do |source_file|
      File.join(override_source_dir, File.basename(source_file))
    end

    symlink_commands = override_source_files.zip(linked_override_source_files).map do |source_file, destination_file|
      "ln -sf #{Shellwords.escape(source_file)} #{Shellwords.escape(destination_file)}"
    end

    spec.prepare_command = <<-CMD
      set -e
      rm -rf #{Shellwords.escape(override_source_dir)}
      mkdir -p #{Shellwords.escape(override_source_dir)}
      #{symlink_commands.join("\n      ")}
    CMD

    spec.source_files = [
      'ios/NativeBrownfieldNavigation.h',
      'ios/BrownfieldNavigationManager.swift',
      *linked_override_source_files.map { |file| file.sub("#{__dir__}/", '') },
    ]
  else
    spec.source_files  = "ios/**/*.{h,m,mm,swift}"
  end

  spec.pod_target_xcconfig = {
    # below: needed to build the XCFramework with `.swiftinterface` files, required by xcodebuild -create-xcframework to succeed
    'DEFINES_MODULE' => 'YES',
    'BUILD_LIBRARY_FOR_DISTRIBUTION' => 'YES',
    'SWIFT_EMIT_MODULE_INTERFACE' => 'YES',
  }

  install_modules_dependencies(spec)
end
