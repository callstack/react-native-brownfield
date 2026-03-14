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
const BROWNFIELD_POST_INTEGRATE_REQUIRE = `require File.join(File.dirname(\`node --print "require.resolve('@callstack/react-native-brownfield/package.json')"\`), "scripts/react_native_brownfield_post_integrate")`;
const REACT_NATIVE_PODS_REQUIRE_REGEX =
  /^require File\.join\(File\.dirname\(`node --print "require\.resolve\('react-native\/package\.json'\)"`\), "scripts\/react_native_pods"\)\s*$/m;

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

function ensureExpoDefinesForSDK55AndAbove(podfile: string): string {
  if (podfile.includes(BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_START)) {
    return podfile;
  }

  const hook = `
    ${BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_START}
    installer.pods_project.targets.each do |target|
      if target.name == 'ReactBrownfield'
        puts "[Brownfield] Adding definition of EXPO_SDK_GTE_55 to target: #{target.name}"

        target.build_configurations.each do |config|
          conditions = config.build_settings['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] || '$(inherited)'
          conditions = conditions.to_s
          config.build_settings['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = "#{conditions} EXPO_SDK_GTE_55"
        end
      end
    end
    ${BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_END}
`;

  const postInstallMatch = podfile.match(
    /(post_install\s+do\s+\|installer\|\s*\n)((?:(?!^\s*end\s*$)[\s\S])*)(^\s*end\s*$)/m
  );

  if (postInstallMatch) {
    const [whole, start, content, end] = postInstallMatch;
    const updated = `${start}${content.trimEnd()}\n${hook}\n${end}`;
    return podfile.replace(whole, updated);
  }

  // if there is no post_install, append one
  return `${podfile.trimEnd()}\n\npost_install do |installer|\n${hook}\nend\n`;
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
    modifiedPodfile = ensureExpoDefinesForSDK55AndAbove(modifiedPodfile);
  }

  return modifiedPodfile;
}
