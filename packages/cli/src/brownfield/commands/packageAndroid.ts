import { packageAarAction } from '@rock-js/plugin-brownfield-android';
import {
  packageAarOptions,
  type PackageAarFlags,
} from '@rock-js/platform-android';

import { Command } from 'commander';

import { getProjectInfo } from '../utils/index.js';
import {
  actionRunner,
  curryOptions,
  ExampleUsage,
} from '../../shared/index.js';

export const packageAndroidCommand = curryOptions(
  new Command('package:android').description('Build Android AAR'),
  packageAarOptions.map((option) =>
    option.name.startsWith('--variant')
      ? { ...option, default: 'debug' }
      : option
  )
).action(
  actionRunner(async (options: PackageAarFlags) => {
    const { projectRoot, platformConfig } = getProjectInfo('android');

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
