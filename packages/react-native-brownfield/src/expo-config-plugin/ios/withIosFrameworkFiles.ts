import * as fs from 'node:fs';
import * as path from 'node:path';

import { withDangerousMod, type ConfigPlugin } from '@expo/config-plugins';

import type {
  RenderedTemplateFile,
  ResolvedBrownfieldPluginConfigWithIos,
} from '../types';
import { Logger } from '../logging';
import { renderTemplate } from '../template/engine';

/**
 * Returns rendered source files for the iOS framework
 * @param ios The iOS Brownfield plugin configuration
 * @returns The list of framework source files
 */
export function getFrameworkSourceFiles(
  ios: ResolvedBrownfieldPluginConfigWithIos['ios']
): RenderedTemplateFile[] {
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
    {
      relativePath: 'ReactNativeHostManager.swift',
      content: renderTemplate('ios', 'ReactNativeHostManager.swift', {}),
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

  // check if framework directory if it exists
  if (fs.existsSync(frameworkDir)) {
    Logger.logDebug(`Framework directory already exists: ${frameworkDir}`);

    return;
  }

  Logger.logDebug(`Creating iOS framework in: ${frameworkDir}`);

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
