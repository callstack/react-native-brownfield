import { publishLocalAarAction } from '@rock-js/plugin-brownfield-android';
import {
  publishLocalAarOptions,
  type PublishLocalAarFlags,
} from '@rock-js/platform-android';

import { Command } from 'commander';

import {
  actionRunner,
  curryOptions,
  ExampleUsage,
} from '../../shared/index.js';
import { getProjectInfo } from '../utils/project.js';
import { runExpoPrebuildIfNeeded } from '../utils/expo.js';

export const publishAndroidCommand = curryOptions(
  new Command('publish:android').description(
    'Publish Android package to Maven local'
  ),
  publishLocalAarOptions
).action(
  actionRunner(async (options: PublishLocalAarFlags) => {
    const { projectRoot, platformConfig } = getProjectInfo('android');
    await runExpoPrebuildIfNeeded({
      projectRoot,
      platform: 'android',
    });

    await publishLocalAarAction({
      projectRoot,
      pluginConfig: platformConfig,
      moduleName: options.moduleName,
    });
  })
);

export const publishAndroidExample = new ExampleUsage(
  'publish:android --module-name :BrownfieldLib',
  "Publish all built variants for 'BrownfieldLib' module to Maven local"
);
