import { withDangerousMod, type ConfigPlugin } from '@expo/config-plugins';
import * as fs from 'node:fs';
import * as path from 'node:path';

import type { ResolvedBrownfieldPluginConfigWithIos } from '../types';
import { Logger } from '../logging';
import { renderTemplate } from '../template/engine';

interface FrameworkFile {
  relativePath: string;
  content: string;
}

// generate framework files
export function getFrameworkSourceFiles(
  ios: ResolvedBrownfieldPluginConfigWithIos['ios']
): FrameworkFile[] {
  return [
    {
      relativePath: `${ios.frameworkName}.swift`,
      content: renderTemplate('ios', 'FrameworkInterface.swift', {}),
    },
    {
      relativePath: 'Info.plist',
      content: renderTemplate('ios', 'Info.plist', {
        '{{BUNDLE_IDENTIFIER}}': ios.bundleIdentifier,
      }),
    },
  ];
}

/**
 * Creates the iOS framework directory structure and files
 * @param iosDir The root iOS directory path
 * @param config The resolved Brownfield plugin configuration
 */
export function createIosFramework(
  iosDir: string,
  config: ResolvedBrownfieldPluginConfigWithIos
) {
  const { ios } = config;
  const frameworkDir = path.join(iosDir, ios.frameworkName);

  Logger.logDebug(`Creating iOS framework in: ${frameworkDir}`);

  // delete framework directory if it exists
  if (fs.existsSync(frameworkDir)) {
    fs.rmSync(frameworkDir, { recursive: true, force: true });

    Logger.logDebug(`Deleted existing directory: ${frameworkDir}`);
  }

  // create framework directory
  if (!fs.existsSync(frameworkDir)) {
    fs.mkdirSync(frameworkDir, { recursive: true });

    Logger.logDebug(`Created directory: ${frameworkDir}`);
  }

  // write files
  for (const file of getFrameworkSourceFiles(ios)) {
    const filePath = path.join(frameworkDir, file.relativePath);

    fs.writeFileSync(filePath, file.content, 'utf8');
  }

  Logger.logDebug(
    `iOS framework "${ios.frameworkName}" files created at ${frameworkDir}`
  );
}

/**
 * Dangerous mod that creates the iOS framework directory and files
 */
export const withIosFrameworkFiles: ConfigPlugin<
  ResolvedBrownfieldPluginConfigWithIos
> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (dangerousConfig) => {
      const iosDir = path.join(dangerousConfig.modRequest.projectRoot, 'ios');

      createIosFramework(iosDir, props);

      return dangerousConfig;
    },
  ]);
};
