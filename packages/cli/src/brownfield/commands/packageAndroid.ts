import { Command } from 'commander';

import {
  type PackageAarFlags,
  packageAarOptions,
} from '@rock-js/platform-android';
import { packageAarAction } from '@rock-js/plugin-brownfield-android';

import {
  ExampleUsage,
  actionRunner,
  curryOptions,
} from '../../shared/index.js';
import { runExpoPrebuildIfNeeded } from '../utils/expo.js';
import { findProjectRoot } from '../utils/paths.js';
import { getProjectInfo } from '../utils/project.js';
import { runBrownieCodegenIfApplicable } from '../../brownie/helpers/runBrownieCodegenIfApplicable.js';
import { runNavigationCodegenIfApplicable } from '../../navigation/helpers/runNavigationCodegenIfApplicable.js';
import { mergeBrownfieldConfigWithOptions } from '../../config.js';

export const packageAndroidCommand = curryOptions(
  new Command('package:android')
    .description('Build Android AAR')
    .option(
      '--local-maven',
      'Use local Maven for Brownfield plugin resolution'
    ),
  packageAarOptions
).action(
  actionRunner(async (cliOptions: PackageAarFlags & { localMaven?: boolean }) => {
    const { localMaven, ...restOptions } = cliOptions;
    const options = mergeBrownfieldConfigWithOptions(
      {
        ...restOptions,
        ...(localMaven ? { useLocalMaven: true } : {}),
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

    await packageAarAction({
      projectRoot,
      pluginConfig: platformConfig,
      moduleName: options.moduleName,
      variant: options.variant,
    });
  })
);

export const packageAndroidExample = new ExampleUsage(
  'package:android --module-name :BrownfieldLib --variant release',
  "Build Android AAR for 'BrownfieldLib' module in release variant"
);
