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
import { findProjectRoot } from '../utils/paths.js';
import { runExpoPrebuildIfNeeded } from '../utils/expo.js';
import { runBrownieCodegenIfApplicable } from '../../brownie/helpers/runBrownieCodegenIfApplicable.js';
import { runNavigationCodegenIfApplicable } from '../../navigation/helpers/runNavigationCodegenIfApplicable.js';
import { mergeBrownfieldConfigWithOptions } from '../../config.js';

export const publishAndroidCommand = curryOptions(
  new Command('publish:android')
    .description('Publish Android package to Maven local')
    .option(
      '--use-local-maven',
      'Use local Maven for Brownfield plugin resolution'
    ),
  publishLocalAarOptions
).action(
  actionRunner(
    async (cliOptions: PublishLocalAarFlags & { useLocalMaven?: boolean }) => {
      const { useLocalMaven, ...restOptions } = cliOptions;
      const options = mergeBrownfieldConfigWithOptions(
        {
          ...restOptions,
          ...(useLocalMaven ? { useLocalMaven: true } : {}),
        },
        'android'
      );
    const projectRoot = findProjectRoot();

    await runExpoPrebuildIfNeeded({
      projectRoot,
      platform: 'android',
    });

    const { platformConfig } = getProjectInfo('android');

    await runBrownieCodegenIfApplicable(projectRoot, 'kotlin');
    await runNavigationCodegenIfApplicable(projectRoot);

      await publishLocalAarAction({
        projectRoot,
        pluginConfig: platformConfig,
        moduleName: options.moduleName,
      });
    }
  )
);

export const publishAndroidExample = new ExampleUsage(
  'publish:android --module-name :BrownfieldLib',
  "Publish all built variants for 'BrownfieldLib' module to Maven local"
);
