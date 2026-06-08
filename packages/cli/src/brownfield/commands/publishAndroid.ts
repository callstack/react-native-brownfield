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
import { runBrownieCodegenIfApplicable } from '../../brownie/helpers/runBrownieCodegenIfApplicable.js';
import { runNavigationCodegenIfApplicable } from '../../navigation/helpers/runNavigationCodegenIfApplicable.js';
import { withNavigationAndroidSourceDirProperty } from '../utils/navigationAndroidSourceOverride.js';

type PublishAndroidCliFlags = PublishLocalAarFlags & {
  outputDir?: string;
};

export const publishAndroidCommand = curryOptions(
  new Command('publish:android').description(
    'Publish Android package to Maven local'
  ),
  publishLocalAarOptions
)
  .option(
    '--output-dir <path>',
    'Custom output directory for generated navigation files used during packaging'
  )
  .action(
    actionRunner(async (options: PublishAndroidCliFlags) => {
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
          publishLocalAarAction({
            projectRoot,
            pluginConfig: platformConfig,
            moduleName: options.moduleName,
          }),
      });
    })
  );

export const publishAndroidExample = new ExampleUsage(
  'publish:android --module-name :BrownfieldLib',
  "Publish all built variants for 'BrownfieldLib' module to Maven local"
);
