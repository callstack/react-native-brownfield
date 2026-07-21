import { SourceModificationError } from '../errors/SourceModificationError';
import { Logger } from '../logging';
import { renderTemplate } from '../template/engine';

const MIN_SUPPORTED_EXPO_SDK_MAJOR_VERSION = 56;

const BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_START =
  '# >>> react-native-brownfield Expo SDK 55+ swift defines >>>';
const BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_END =
  '# <<< react-native-brownfield Expo SDK 55+ swift defines <<<';

function ensureExpoDefinesForSDK55AndAbove(
  podfile: string,
  expoMajor: number
): string {
  if (podfile.includes(BROWNFIELD_EXPO_GTE_55_SWIFT_DEFINES_MARKER_START)) {
    return podfile;
  }

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

  if (expoMajor < MIN_SUPPORTED_EXPO_SDK_MAJOR_VERSION) {
    const versionLabel = expoMajor < 0 ? 'unknown' : expoMajor.toString();
    throw new SourceModificationError(
      `Expo SDK ${versionLabel} is not supported. Please use Expo SDK ${MIN_SUPPORTED_EXPO_SDK_MAJOR_VERSION} or newer. For older versions, please see the matrix of supported versions: https://oss.callstack.com/react-native-brownfield/docs/getting-started/introduction#expo-version-compatibility`
    );
  }

  modifiedPodfile = ensureExpoDefinesForSDK55AndAbove(
    modifiedPodfile,
    expoMajor
  );

  return modifiedPodfile;
}
