import { brownfieldGradlePluginDependency } from './constants';
import { Logger } from '../logging';

/**
 * Modifies the root build.gradle to add the Brownfield Gradle plugin dependency
 * @param contents The original build.gradle content
 * @returns The modified build.gradle content
 */
export function modifyRootBuildGradle(contents: string): string {
  // check if already added
  if (contents.includes('brownfield-gradle-plugin')) {
    Logger.logDebug(
      'Brownfield Gradle plugin already in root build.gradle, skipping'
    );
    return contents;
  }

  Logger.logDebug(
    `Modifying root build.gradle to add the Gradle Brownfield plugin`
  );

  // find the buildscript dependencies block
  const buildscriptDepsRegex =
    /(buildscript\s*\{[\s\S]*?dependencies\s*\{[\s\S]*?)(})/m;
  const match = contents.match(buildscriptDepsRegex);

  if (!match) {
    throw new Error('Could not locate buildscript block in root build.gradle');
  }

  // insert before the closing brace of dependencies
  const insertion = `\t${brownfieldGradlePluginDependency}\n\t`;
  const modifiedContents = contents.replace(
    buildscriptDepsRegex,
    `$1${insertion}$2`
  );

  Logger.logDebug('Added Brownfield Gradle plugin to root build.gradle');
  return modifiedContents;
}

/**
 * Modifies settings.gradle to include the Brownfield module
 * @param contents The original settings.gradle content
 * @param moduleName The name of the Brownfield module to include
 * @returns The modified settings.gradle content
 */
export function modifySettingsGradle(
  contents: string,
  moduleName: string
): string {
  const includeStatement = `include ':${moduleName}'`;

  // check if already included
  if (contents.includes(includeStatement)) {
    Logger.logDebug(
      `Module "${moduleName}" already in settings.gradle, skipping`
    );
    return contents;
  }

  Logger.logDebug(
    `Modifying settings.gradle to include module "${moduleName}"`
  );

  // add the include statement at the end
  const modifiedContents = contents + `\n${includeStatement}\n`;

  Logger.logDebug(`Added module "${moduleName}" to settings.gradle`);

  return modifiedContents;
}
