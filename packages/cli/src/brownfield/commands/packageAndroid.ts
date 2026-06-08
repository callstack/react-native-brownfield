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
import { getProjectInfo } from '../utils/project.js';
import { runBrownieCodegenIfApplicable } from '../../brownie/helpers/runBrownieCodegenIfApplicable.js';
import { runNavigationCodegenIfApplicable } from '../../navigation/helpers/runNavigationCodegenIfApplicable.js';
import { withNavigationAndroidSourceDirProperty } from '../utils/navigationAndroidSourceOverride.js';

type PackageAndroidCliFlags = PackageAarFlags & {
  outputDir?: string;
};

export const packageAndroidCommand = curryOptions(
  new Command('package:android').description('Build Android AAR'),
  packageAarOptions.map((option) =>
    option.name.startsWith('--variant')
      ? { ...option, default: 'debug' }
      : option
  )
)
  .option(
    '--output-dir <path>',
    'Custom output directory for generated navigation files used during packaging'
  )
  .action(
    actionRunner(async (options: PackageAndroidCliFlags) => {
      const { projectRoot, platformConfig } = getProjectInfo('android');
      await runExpoPrebuildIfNeeded({
        projectRoot,
        platform: 'android',
      });

      await runBrownieCodegenIfApplicable(projectRoot, 'kotlin');
      await runNavigationCodegenIfApplicable(projectRoot, {
        outputDir: options.outputDir,
      });

      await withNavigationAndroidSourceDirProperty({
        projectRoot,
        outputDir: options.outputDir,
        run: async () =>
          packageAarAction({
            projectRoot,
            pluginConfig: platformConfig,
            moduleName: options.moduleName,
            variant: options.variant,
          }),
      });
    })
  );

export const packageAndroidExample = new ExampleUsage(
  'package:android --module-name :BrownfieldLib --variant release',
  "Build Android AAR for 'BrownfieldLib' module in release variant"
);
