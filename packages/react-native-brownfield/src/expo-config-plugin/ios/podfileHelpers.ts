import { log } from '../logging';

/**
 * Modifies the Podfile to include the brownfield framework target
 * @param podfile The original Podfile content
 * @param frameworkName The name of the framework target to add
 * @returns The modified Podfile content
 */
export function modifyPodfile(podfile: string, frameworkName: string): string {
  // check if the framework target is already included
  if (podfile.includes(`target '${frameworkName}'`)) {
    log(
      `Framework target "${frameworkName}" already in Podfile, skipping modification`
    );
    return podfile;
  }

  // find the main app target block and add the framework target inside it: `target 'AppName' do ... end`
  const targetRegex = /(target\s+['"][^'"]+['"]\s+do\s*\n)/;
  const match = podfile.match(targetRegex);

  if (!match) {
    throw new Error(
      'Could not find main target in Podfile. Please manually add the framework target. Please raise a bug: https://github.com/callstack/react-native-brownfield/issues'
    );
  }

  // insert the framework target after the main target's "do"
  const frameworkTargetBlock = `
  # Brownfield framework target for packaging as XCFramework
  target '${frameworkName}' do
    inherit! :complete
  end

`;

  // Find where to insert - after the first target's content begins, before the end of the target block
  const mainTargetMatch = podfile.match(
    /(target\s+['"][^'"]+['"]\s+do\s*\n)([\s\S]*?)(^end\s*$)/m
  );

  if (mainTargetMatch) {
    const [, targetStart, targetContent] = mainTargetMatch;
    const insertIndex =
      podfile.indexOf(mainTargetMatch[0]) +
      targetStart.length +
      targetContent.length;

    const modifiedPodfile =
      podfile.slice(0, insertIndex) +
      frameworkTargetBlock +
      podfile.slice(insertIndex);

    log(`Added framework target "${frameworkName}" to Podfile`);

    return modifiedPodfile;
  }

  // Fallback: append at the end of the target block
  // Find the last "end" that closes the main target
  const lines = podfile.split('\n');
  let depth = 0;
  let insertLineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^target\s+/.test(line)) {
      depth++;
    } else if (line === 'end' && depth > 0) {
      depth--;
      if (depth === 0) {
        insertLineIndex = i;
        break;
      }
    }
  }

  if (insertLineIndex !== -1) {
    lines.splice(insertLineIndex, 0, frameworkTargetBlock.trim());
    log(`Added framework target "${frameworkName}" to Podfile (fallback)`);
    return lines.join('\n');
  }

  throw new Error(
    'Could not find insertion point in Podfile. Please manually add the framework target.'
  );
}

/**
 * Returns the Podfile content that should be added for the framework target
 */
export function getFrameworkPodfileTarget(frameworkName: string): string {
  return `
  # Brownfield framework target for packaging as XCFramework
  # This target inherits all pods from the parent target
  target '${frameworkName}' do
    inherit! :complete
  end
`;
}
