import { brownfieldGradlePluginDependency } from './constants';
import { Logger } from '../../logging';

const LOCAL_GRADLE_PLUGIN_INCLUDE_BUILD =
  'includeBuild("../node_modules/@callstack/react-native-brownfield/gradle-plugin/brownfield")';

type GradleModificationOptions = {
  useLocalGradlePlugin?: boolean;
};

/**
 * Modifies the root build.gradle to add the Brownfield Gradle plugin dependency
 * @param contents The original build.gradle content
 * @returns The modified build.gradle content
 */
export function modifyRootBuildGradle(
  contents: string,
  { useLocalGradlePlugin = false }: GradleModificationOptions = {}
): string {
  if (useLocalGradlePlugin) {
    Logger.logDebug(
      'Skipping Maven Brownfield Gradle plugin classpath because useLocalGradlePlugin is enabled'
    );
    return contents;
  }

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

function addLocalGradlePluginIncludeBuild(contents: string): string {
  if (contents.includes('gradle-plugin/brownfield')) {
    Logger.logDebug(
      'Local Brownfield Gradle plugin includeBuild already present, skipping'
    );
    return contents;
  }

  Logger.logDebug(
    'Modifying settings.gradle to include local Brownfield Gradle plugin'
  );

  const pluginManagementMatch = contents.match(/pluginManagement\s*\{/);

  if (pluginManagementMatch?.index !== undefined) {
    const insertIndex =
      pluginManagementMatch.index + pluginManagementMatch[0].length;
    const insertion = `\n\t${LOCAL_GRADLE_PLUGIN_INCLUDE_BUILD}`;

    return (
      contents.slice(0, insertIndex) + insertion + contents.slice(insertIndex)
    );
  }

  return `pluginManagement {\n\t${LOCAL_GRADLE_PLUGIN_INCLUDE_BUILD}\n}\n\n${contents}`;
}

/**
 * Modifies settings.gradle to include the Brownfield module
 * @param contents The original settings.gradle content
 * @param moduleName The name of the Brownfield module to include
 * @returns The modified settings.gradle content
 */
export function modifySettingsGradle(
  contents: string,
  moduleName: string,
  { useLocalGradlePlugin = false }: GradleModificationOptions = {}
): string {
  let modifiedContents = contents;

  if (useLocalGradlePlugin) {
    modifiedContents = addLocalGradlePluginIncludeBuild(modifiedContents);
  }

  const includeStatement = `include ':${moduleName}'`;

  // check if already included
  if (modifiedContents.includes(includeStatement)) {
    Logger.logDebug(
      `Module "${moduleName}" already in settings.gradle, skipping`
    );
    return modifiedContents;
  }

  Logger.logDebug(
    `Modifying settings.gradle to include module "${moduleName}"`
  );

  // add the include statement at the end
  modifiedContents = modifiedContents + `\n${includeStatement}\n`;

  Logger.logDebug(`Added module "${moduleName}" to settings.gradle`);

  return modifiedContents;
}
