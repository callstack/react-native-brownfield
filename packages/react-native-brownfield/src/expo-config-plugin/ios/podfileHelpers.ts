import { SourceModificationError } from '../errors/SourceModificationError';
import { Logger } from '../logging';
import { renderTemplate } from '../template/engine';

const BROWNFIELD_POD_HOOK_MARKER_START =
  '# >>> react-native-brownfield expo phase ordering >>>';
const BROWNFIELD_POD_HOOK_MARKER_END =
  '# <<< react-native-brownfield expo phase ordering <<<';

function ensureExpoPhaseOrderingHook(podfile: string): string {
  if (podfile.includes(BROWNFIELD_POD_HOOK_MARKER_START)) {
    return podfile;
  }

  const hook = `
${BROWNFIELD_POD_HOOK_MARKER_START}
def reorder_brownfield_expo_patch_phase!(installer)
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

post_integrate do |installer|
  reorder_brownfield_expo_patch_phase!(installer)
end
${BROWNFIELD_POD_HOOK_MARKER_END}
`;

  return `${podfile.trimEnd()}\n\n${hook}\n`;
}

/**
 * Modifies the Podfile to include the Brownfield framework target
 * @param podfile The original Podfile content
 * @param frameworkName The name of the framework target to add
 * @returns The modified Podfile content
 */
export function modifyPodfile(
  podfile: string,
  frameworkName: string,
  isExpoPre55: boolean
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

  if (isExpoPre55) {
    modifiedPodfile = ensureExpoPhaseOrderingHook(modifiedPodfile);
  }

  return modifiedPodfile;
}
