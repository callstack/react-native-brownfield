import { Command } from 'commander';
import { intro, outro } from '@rock-js/tools';

import { actionRunner } from '../../shared/index.js';
import { runNavigationCodegen } from '../runner.js';

interface RunNavigationCodegenCommandOptions {
  dryRun?: boolean;
}

interface NavigationCodegenActionOptions {
  specPath?: string;
  dryRun?: boolean;
}

export async function runNavigationCodegenCommand({
  specPath,
  dryRun = false,
}: NavigationCodegenActionOptions): Promise<void> {
  intro('Running Brownfield Navigation codegen');
  await runNavigationCodegen({
    specPath,
    dryRun,
  });
  outro('Done!');
}

export const navigationCodegenCommand = new Command('navigation:codegen')
  .description(
    'Generate Brownfield Navigation native bindings from brownfield.navigation.ts'
  )
  .argument(
    '[specPath]',
    'Path to navigation spec file (defaults to brownfield.navigation.ts)'
  )
  .option('--dry-run', 'Print generated code without writing files')
  .action(
    actionRunner(
      async (
        ...args: Array<string | RunNavigationCodegenCommandOptions | undefined>
      ) => {
        const specPath = typeof args[0] === 'string' ? args[0] : undefined;
        const options =
          args.find(
            (
              arg
            ): arg is RunNavigationCodegenCommandOptions =>
              typeof arg === 'object' && arg !== null && 'dryRun' in arg
          ) ?? {};

        await runNavigationCodegenCommand({
          specPath,
          dryRun: Boolean(options.dryRun),
        });
      }
    )
  );
