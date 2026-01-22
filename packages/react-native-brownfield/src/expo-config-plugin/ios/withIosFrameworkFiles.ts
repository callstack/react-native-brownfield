import { withDangerousMod, type ConfigPlugin } from '@expo/config-plugins';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { getFrameworkInterfaceContent } from './xcodeHelpers';
import type { ResolvedBrownfieldPluginConfigWithIos } from '../types';
import { log } from '../logging';

interface FrameworkFile {
  relativePath: string;
  content: string;
}

/**
 * Creates the iOS framework directory structure and files
 */
export function createIosFramework(
  iosDir: string,
  config: ResolvedBrownfieldPluginConfigWithIos
): void {
  const { ios } = config;
  const frameworkDir = path.join(iosDir, ios.frameworkName);

  // Create framework directory
  if (!fs.existsSync(frameworkDir)) {
    fs.mkdirSync(frameworkDir, { recursive: true });
    if (config.debug) {
      log(`Created directory: ${frameworkDir}`);
    }
  }

  // Generate framework files
  const files: FrameworkFile[] = [
    {
      relativePath: `${ios.frameworkName}.swift`,
      content: getFrameworkInterfaceContent(ios.frameworkName),
    },
    {
      relativePath: 'Info.plist',
      content: getFrameworkInfoPlist(ios.bundleIdentifier),
    },
  ];

  // Write files
  for (const file of files) {
    const filePath = path.join(frameworkDir, file.relativePath);

    // Only write if file doesn't exist or content is different
    if (
      !fs.existsSync(filePath) ||
      fs.readFileSync(filePath, 'utf8') !== file.content
    ) {
      fs.writeFileSync(filePath, file.content, 'utf8');
      if (config.debug) {
        log(`Created file: ${filePath}`);
      }
    }
  }

  log(`iOS framework "${ios.frameworkName}" files created at ${frameworkDir}`);
}

/**
 * Returns the Info.plist content for the framework
 */
function getFrameworkInfoPlist(bundleIdentifier: string): string {
  return;
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

      if (props.debug) {
        log(`Creating iOS framework in: ${iosDir}`);
      }

      createIosFramework(iosDir, props);

      return dangerousConfig;
    },
  ]);
};
