import { brownfieldGradlePluginDependency } from './constants';
import { Logger } from '../../logging';

const brownfieldPluginIncludeBuildSnippet = `def brownfieldGradlePlugin =
    providers.exec {
      workingDir(rootDir)
      commandLine(
        "node",
        "--print",
        "(() => { const fs = require('fs'); const path = require('path'); const packageJsonPath = require.resolve('@callstack/react-native-brownfield/package.json', { paths: [require.resolve('react-native/package.json')] }); const packageDir = path.dirname(packageJsonPath); const candidates = [path.join(packageDir, 'gradle-plugin', 'react'), path.join(packageDir, '..', '..', 'gradle-plugins', 'react')]; const match = candidates.find((candidate) => fs.existsSync(candidate)); if (!match) { throw new Error('Unable to locate the Brownfield Gradle plugin sources.'); } return match; })()"
      )
    }.standardOutput.asText.get().trim()
  includeBuild(brownfieldGradlePlugin)`;
const pluginManagementRepositoriesBlock = `repositories {
    google()
    mavenCentral()
    gradlePluginPortal()
  }`;

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
  let modifiedContents = normalizeBrownfieldPluginIncludeBuild(contents);

  if (modifiedContents.includes('pluginManagement {')) {
    modifiedContents = ensurePluginManagementRepositories(modifiedContents);
    modifiedContents = ensurePluginManagementIncludeBuild(modifiedContents);
  } else {
    modifiedContents =
      `pluginManagement {\n  ${pluginManagementRepositoriesBlock}\n  ${brownfieldPluginIncludeBuildSnippet}\n}\n\n` +
      modifiedContents;
  }

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
  modifiedContents += `\n${includeStatement}\n`;

  Logger.logDebug(`Added module "${moduleName}" to settings.gradle`);

  return modifiedContents;
}

function ensurePluginManagementRepositories(contents: string): string {
  const pluginManagementWithRepositoriesRegex =
    /(pluginManagement\s*\{[\s\S]*?repositories\s*\{[\s\S]*?\}[\s\S]*?\})/m;

  if (pluginManagementWithRepositoriesRegex.test(contents)) {
    return contents;
  }

  return contents.replace(
    /(pluginManagement\s*\{)/,
    `$1\n  ${pluginManagementRepositoriesBlock}`
  );
}

function ensurePluginManagementIncludeBuild(contents: string): string {
  if (contents.includes(brownfieldPluginIncludeBuildSnippet)) {
    return contents;
  }

  const pluginManagementRegex = /pluginManagement\s*\{([\s\S]*?)\n\}/m;
  const match = contents.match(pluginManagementRegex);

  if (!match) {
    return contents;
  }

  return contents.replace(
    pluginManagementRegex,
    `pluginManagement {${match[1]}\n  ${brownfieldPluginIncludeBuildSnippet}\n}`
  );
}

function normalizeBrownfieldPluginIncludeBuild(contents: string): string {
  return contents
    .replace(
      /\n\s*includeBuild\("\.\.\/node_modules\/@callstack\/react-native-brownfield\/gradle-plugin\/react"\)\s*/g,
      '\n'
    )
    .replace(
      /\n\s*def brownfieldGradlePlugin = new File\([\s\S]*?includeBuild\(brownfieldGradlePlugin\)\s*/g,
      '\n'
    );
}
