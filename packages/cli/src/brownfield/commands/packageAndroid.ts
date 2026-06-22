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
import { patchAndroidWorkletsImportPaths } from '../utils/patchAndroidWorkletsImportPaths.js';
import { getProjectInfo } from '../utils/project.js';
import { runBrownieCodegenIfApplicable } from '../../brownie/helpers/runBrownieCodegenIfApplicable.js';
import { runNavigationCodegenIfApplicable } from '../../navigation/helpers/runNavigationCodegenIfApplicable.js';
import { mergeBrownfieldConfigWithOptions } from '../../config.js';

export const packageAndroidCommand = curryOptions(
  new Command('package:android').description('Build Android AAR'),
  packageAarOptions
).action(
  actionRunner(async (cliOptions: PackageAarFlags) => {
    const options = mergeBrownfieldConfigWithOptions(cliOptions, 'android');

    const { projectRoot, platformConfig } = getProjectInfo('android');
    await runExpoPrebuildIfNeeded({
      projectRoot,
      platform: 'android',
    });
    patchAndroidWorkletsImportPaths(projectRoot);

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
