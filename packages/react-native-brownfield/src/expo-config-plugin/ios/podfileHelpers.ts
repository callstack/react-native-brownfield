import { SourceModificationError } from '../errors/SourceModificationError';
import { Logger } from '../logging';
import { renderTemplate } from '../template/engine';

const BROWNFIELD_POD_HOOK_MARKER_START =
  '# >>> react-native-brownfield expo phase ordering >>>';
const BROWNFIELD_POD_HOOK_MARKER_END =
  '# <<< react-native-brownfield expo phase ordering <<<';
const BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_START =
  '# >>> react-native-brownfield Expo SDK 55+ swift defines >>>';
const BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_END =
  '# <<< react-native-brownfield Expo SDK 55+ swift defines <<<';
const BROWNFIELD_DEBUG_SWIFT_INTERFACE_MARKER_START =
  '# >>> react-native-brownfield Debug swift interface overrides >>>';
const BROWNFIELD_DEBUG_SWIFT_INTERFACE_MARKER_END =
  '# <<< react-native-brownfield Debug swift interface overrides <<<';
const BROWNFIELD_REACT_PREBUILT_INTEROP_MARKER_START =
  '# >>> react-native-brownfield React prebuilt interoperability >>>';
const BROWNFIELD_REACT_PREBUILT_INTEROP_MARKER_END =
  '# <<< react-native-brownfield React prebuilt interoperability <<<';
const BROWNFIELD_POST_INTEGRATE_REQUIRE = `require File.join(File.dirname(\`node --print "require.resolve('@callstack/react-native-brownfield/package.json')"\`), "scripts/react_native_brownfield_post_integrate")`;
const REACT_NATIVE_PODS_REQUIRE_REGEX =
  /^require File\.join\(File\.dirname\(`node --print "require\.resolve\('react-native\/package\.json'\)"`\), "scripts\/react_native_pods"\)\s*$/m;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceMarkedBlock(
  podfile: string,
  markerStart: string,
  markerEnd: string,
  block: string
): string {
  const existingBlockPattern = new RegExp(
    `\\n?\\s*${escapeRegExp(markerStart)}[\\s\\S]*?${escapeRegExp(
      markerEnd
    )}\\n?`,
    'm'
  );

  if (existingBlockPattern.test(podfile)) {
    return podfile.replace(existingBlockPattern, `\n${block}\n`);
  }

  return podfile;
}

function insertIntoPostInstallBlock(podfile: string, snippet: string): string {
  const lines = podfile.split('\n');
  const postInstallIndex = lines.findIndex((line) =>
    /^\s*post_install do \|installer\|/.test(line)
  );

  if (postInstallIndex === -1) {
    return `${podfile.trimEnd()}\n\npost_install do |installer|\n${snippet}\nend\n`;
  }

  const baseIndent = lines[postInstallIndex].match(/^(\s*)/)?.[1].length ?? 0;
  let insertionIndex = -1;

  for (let index = postInstallIndex + 1; index < lines.length; index += 1) {
    const endMatch = lines[index].match(/^(\s*)end\s*$/);
    if (!endMatch) {
      continue;
    }

    const endIndent = endMatch[1].length;
    if (endIndent === baseIndent) {
      insertionIndex = index;
      break;
    }
  }

  if (insertionIndex === -1) {
    return podfile;
  }

  lines.splice(insertionIndex, 0, snippet);
  return lines.join('\n');
}

function ensureBrownfieldPostIntegrateRequire(podfile: string): string {
  if (podfile.includes('scripts/react_native_brownfield_post_integrate')) {
    return podfile;
  }

  const reactNativePodsRequireMatch = podfile.match(
    REACT_NATIVE_PODS_REQUIRE_REGEX
  );
  if (reactNativePodsRequireMatch) {
    const requireLine = reactNativePodsRequireMatch[0];
    return podfile.replace(
      requireLine,
      `${requireLine}\n${BROWNFIELD_POST_INTEGRATE_REQUIRE}\n`
    );
  }

  return `${BROWNFIELD_POST_INTEGRATE_REQUIRE}\n\n${podfile}`;
}

function ensureExpoPhaseOrderingHook(podfile: string): string {
  let modifiedPodfile = ensureBrownfieldPostIntegrateRequire(podfile);

  if (modifiedPodfile.includes(BROWNFIELD_POD_HOOK_MARKER_START)) {
    return modifiedPodfile;
  }

  const hook = `
${BROWNFIELD_POD_HOOK_MARKER_START}
post_integrate do |installer|
  react_native_brownfield_post_integrate(installer)
end
${BROWNFIELD_POD_HOOK_MARKER_END}
`;

  modifiedPodfile = `${modifiedPodfile.trimEnd()}\n\n${hook}\n`;

  return modifiedPodfile;
}

function ensureExpoDefinesForSDK55AndAbove(
  podfile: string,
  expoMajor: number
): string {
  const defaultDeploymentTarget = expoMajor >= 56 ? '16.4' : '15.1';
  const hook = `
    ${BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_START}
    brownfield_ios_deployment_target = podfile_properties['ios.deploymentTarget'] || '${defaultDeploymentTarget}'
    installer.pods_project.targets.each do |target|
      if target.name == 'ReactBrownfield'
        puts "[Brownfield] Adding definition of EXPO_SDK_GTE_55 to target: #{target.name}"

        target.build_configurations.each do |config|
          conditions = config.build_settings['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] || '$(inherited)'
          conditions = conditions.to_s
          config.build_settings['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = "#{conditions} EXPO_SDK_GTE_55"
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = brownfield_ios_deployment_target
        end
      end
    end
    ${BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_END}
`;
  const withoutExistingBlock = replaceMarkedBlock(
    podfile,
    BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_START,
    BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_END,
    hook.trim()
  );

  if (
    withoutExistingBlock.includes(
      BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_START
    )
  ) {
    return withoutExistingBlock;
  }

  return insertIntoPostInstallBlock(withoutExistingBlock, hook.trimEnd());
}

function ensureDebugSwiftInterfaceOverrides(podfile: string): string {
  const hook = `
    ${BROWNFIELD_DEBUG_SWIFT_INTERFACE_MARKER_START}
    Dir.glob(File.join(installer.sandbox.root, 'Target Support Files', '**', '*.debug.xcconfig')).each do |xcconfig_path|
      next unless File.exist?(xcconfig_path)

      content = File.read(xcconfig_path)
      updated = content.gsub(/^BUILD_LIBRARY_FOR_DISTRIBUTION = YES$/, 'BUILD_LIBRARY_FOR_DISTRIBUTION = NO')

      unless updated.match?(/^SWIFT_EMIT_MODULE_INTERFACE = NO$/)
        updated = "#{updated.rstrip}\\nSWIFT_EMIT_MODULE_INTERFACE = NO\\n"
      end

      next if updated == content

      File.chmod(0644, xcconfig_path)
      File.write(xcconfig_path, updated)
    end

    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        next unless config.name == 'Debug'

        flags = config.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)'
        flags = flags.to_s
        unless flags.include?('-no-verify-emitted-module-interface')
          config.build_settings['OTHER_SWIFT_FLAGS'] = "#{flags} -no-verify-emitted-module-interface"
        end

        config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'NO'
        config.build_settings['SWIFT_EMIT_MODULE_INTERFACE'] = 'NO'
      end
    end
    ${BROWNFIELD_DEBUG_SWIFT_INTERFACE_MARKER_END}
`;
  const withoutExistingBlock = replaceMarkedBlock(
    podfile,
    BROWNFIELD_DEBUG_SWIFT_INTERFACE_MARKER_START,
    BROWNFIELD_DEBUG_SWIFT_INTERFACE_MARKER_END,
    hook.trim()
  );

  if (
    withoutExistingBlock.includes(BROWNFIELD_DEBUG_SWIFT_INTERFACE_MARKER_START)
  ) {
    return withoutExistingBlock;
  }

  return insertIntoPostInstallBlock(withoutExistingBlock, hook.trimEnd());
}

function ensureReactPrebuiltInteroperability(podfile: string): string {
  const hook = `
    ${BROWNFIELD_REACT_PREBUILT_INTEROP_MARKER_START}
    react_prebuilt_dir = installer.sandbox.pod_dir('React-Core-prebuilt')
    react_vfs_path = File.join(react_prebuilt_dir, 'React-VFS.yaml')
    react_modulemap_paths = Dir.glob(File.join(react_prebuilt_dir, 'React.xcframework', '**', 'module.modulemap'))
    react_framework_module = <<~'MODULEMAP'
    framework module React {
      umbrella header "React_Core/React_Core-umbrella.h"
      export *
      module * { export * }
    }

    MODULEMAP

    react_modulemap_paths.each do |modulemap_path|
      next unless File.exist?(modulemap_path)

      modulemap = File.read(modulemap_path)
      next if modulemap.match?(/^\\s*framework module React\\b/)

      File.chmod(0644, modulemap_path)
      File.write(modulemap_path, "#{react_framework_module}#{modulemap}")
    end

    if File.exist?(react_vfs_path)
      react_c_flags = "-ivfsoverlay #{react_vfs_path}"
      react_swift_flags = "-Xcc -ivfsoverlay -Xcc #{react_vfs_path}"
      normalize_build_setting = lambda do |value, fallback = '$(inherited)'|
        normalized = Array(value).flatten.compact.map(&:to_s).reject(&:empty?).join(' ').strip
        normalized.empty? ? fallback : normalized
      end
      search_path_keys = %w[
        FRAMEWORK_SEARCH_PATHS
        HEADER_SEARCH_PATHS
        LIBRARY_SEARCH_PATHS
        USER_HEADER_SEARCH_PATHS
      ]

      installer.pods_project.targets.each do |target|
        target.build_configurations.each do |config|
          search_path_keys.each do |key|
            next unless config.build_settings.key?(key)

            config.build_settings[key] = normalize_build_setting.call(
              config.build_settings[key],
              ''
            )
          end

          %w[OTHER_CFLAGS OTHER_CPLUSPLUSFLAGS].each do |key|
            flags = normalize_build_setting.call(config.build_settings[key])
            unless flags.include?(react_vfs_path)
              config.build_settings[key] = "#{flags} #{react_c_flags}"
            end
          end

          swift_flags = normalize_build_setting.call(config.build_settings['OTHER_SWIFT_FLAGS'])
          unless swift_flags.include?(react_vfs_path)
            config.build_settings['OTHER_SWIFT_FLAGS'] = "#{swift_flags} #{react_swift_flags}"
          end
        end
      end
    end
    ${BROWNFIELD_REACT_PREBUILT_INTEROP_MARKER_END}
`;
  const withoutExistingBlock = replaceMarkedBlock(
    podfile,
    BROWNFIELD_REACT_PREBUILT_INTEROP_MARKER_START,
    BROWNFIELD_REACT_PREBUILT_INTEROP_MARKER_END,
    hook.trim()
  );

  if (
    withoutExistingBlock.includes(
      BROWNFIELD_REACT_PREBUILT_INTEROP_MARKER_START
    )
  ) {
    return withoutExistingBlock;
  }

  return insertIntoPostInstallBlock(withoutExistingBlock, hook.trimEnd());
}

/**
 * Modifies the Podfile to include the Brownfield framework target
 * @param podfile The original Podfile content
 * @param frameworkName The name of the framework target to add
 * @param expoMajor The major version of the Expo SDK
 * @returns The modified Podfile content
 */
export function modifyPodfile(
  podfile: string,
  frameworkName: string,
  expoMajor: number
): string {
  // check if the framework target is already included
  if (podfile.includes(`target '${frameworkName}'`)) {
    Logger.logDebug(
      `Framework target "${frameworkName}" already in Podfile, skipping modification`
    );
    return podfile;
  }

  Logger.logDebug(`Modifying Podfile for framework: ${frameworkName}`);

  // insert the framework target after the main target's "do"
  const frameworkTargetBlock = renderTemplate('ios', 'PodfileTargetBlock.rb', {
    '{{FRAMEWORK_NAME}}': frameworkName,
  });

  // find insertion point after the first target's content begins, before the end of the target block
  const mainTargetMatch = podfile.match(
    /(target\s+['"][^'"]+['"]\s+do\s*\n)([\s\S]*?)(^end\s*$)/m
  );

  if (!mainTargetMatch) {
    throw new SourceModificationError(
      'Could not find main target in Podfile. Please manually add the framework target.'
    );
  }

  const [, targetStart, targetContent] = mainTargetMatch;
  const insertIndex =
    podfile.indexOf(mainTargetMatch[0]) +
    targetStart.length +
    targetContent.length;

  let modifiedPodfile =
    podfile.slice(0, insertIndex) +
    frameworkTargetBlock +
    podfile.slice(insertIndex);

  Logger.logDebug(`Added framework target "${frameworkName}" to Podfile`);

  if (expoMajor < 55) {
    modifiedPodfile = ensureExpoPhaseOrderingHook(modifiedPodfile);
  } else {
    // Expo SDK >= 55
    modifiedPodfile = ensureExpoDefinesForSDK55AndAbove(
      modifiedPodfile,
      expoMajor
    );
  }

  modifiedPodfile = ensureReactPrebuiltInteroperability(modifiedPodfile);
  modifiedPodfile = ensureDebugSwiftInterfaceOverrides(modifiedPodfile);

  return modifiedPodfile;
}
