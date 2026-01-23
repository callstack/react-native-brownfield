import { SourceModificationError } from '../errors/SourceModificationError';
import { Logger } from '../logging';
import { renderTemplate } from '../template/engine';

/**
 * Modifies the Podfile to include the Brownfield framework target
 * @param podfile The original Podfile content
 * @param frameworkName The name of the framework target to add
 * @returns The modified Podfile content
 */
export function modifyPodfile(podfile: string, frameworkName: string): string {
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

  const modifiedPodfile =
    podfile.slice(0, insertIndex) +
    frameworkTargetBlock +
    podfile.slice(insertIndex);

  Logger.logDebug(`Added framework target "${frameworkName}" to Podfile`);

  return modifiedPodfile;
}
