def react_native_brownfield_patch_fmt_consteval(installer)
  # Xcode 26+ clang: fmt's consteval format strings fail to compile (RCT-Folly dependency).
  fmt_base_paths = [
    File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h'),
    File.join(installer.sandbox.root, 'ReactNativeDependencies', 'Headers', 'fmt', 'base.h'),
  ]

  fmt_base_paths.each do |fmt_base|
    next unless File.exist?(fmt_base)

    content = File.read(fmt_base)
    next if content.include?('Xcode 26 workaround')

    patched = content.gsub(
      /^(#elif defined\(__cpp_consteval\)\n#  define FMT_USE_CONSTEVAL) 1/,
      "// Xcode 26 workaround: disable consteval\n\\1 0"
    )
    next if patched == content

    File.chmod(0644, fmt_base)
    File.write(fmt_base, patched)
  end
end

def react_native_brownfield_mitigate_expo_modules_core_xcode26_swift_compiler_crash(installer)
  # Xcode 26.x can crash in the SendNonSendable SIL pass when compiling ExpoModulesCore.
  # https://github.com/expo/expo/issues/43199
  installer.pods_project.targets.each do |target|
    next unless target.name == 'ExpoModulesCore'

    target.build_configurations.each do |config|
      config.build_settings['SWIFT_VERSION'] = '5.10'
      config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      config.build_settings['SWIFT_COMPILATION_MODE'] = 'singlefile'
    end
  end
end

def react_native_brownfield_skip_swift_module_interface_verification(installer)
  # BrownfieldLib inherits BUILD_LIBRARY_FOR_DISTRIBUTION via CocoaPods xcconfigs;
  # those values are not visible on target.build_settings during post_install.
  # Newer Xcode fails SwiftVerifyEmittedModuleInterface for several pods (Brownie,
  # ReachabilitySwift, etc.). Skip verification for all Pods targets; interfaces
  # are still emitted when SWIFT_EMIT_MODULE_INTERFACE is enabled in xcconfig.
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      flags = config.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'
      flags = flags.is_a?(Array) ? flags.join(' ') : flags.to_s
      next if flags.include?('-no-verify-emitted-module-interface')

      config.build_settings['OTHER_SWIFT_FLAGS'] =
        "#{flags} -no-verify-emitted-module-interface"
    end
  end
end

def react_native_brownfield_post_integrate(installer)
  react_native_brownfield_patch_fmt_consteval(installer)
  react_native_brownfield_mitigate_expo_modules_core_xcode26_swift_compiler_crash(installer)
  react_native_brownfield_skip_swift_module_interface_verification(installer)

  projects = installer.aggregate_targets.map(&:user_project).compact.uniq
  projects.each do |project|
    modified = false

    project.native_targets.each do |target|
      phases = target.build_phases
      expo_idx = phases.index { |p| p.respond_to?(:name) && p.name == '[Expo] Configure project' }
      patch_idx = phases.index { |p| p.respond_to?(:name) && p.name == 'Patch ExpoModulesProvider' }

      next if expo_idx.nil? || patch_idx.nil?
      next if patch_idx > expo_idx

      patch = phases.delete_at(patch_idx)
      expo_idx = phases.index { |p| p.respond_to?(:name) && p.name == '[Expo] Configure project' }
      phases.insert(expo_idx + 1, patch)
      modified = true
    end

    project.save if modified
  end
end
