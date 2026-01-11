import path from 'node:path';
import { styleText } from 'node:util';

import { Command, Option } from 'commander';

import { actionRunner } from '../../shared/index.js';
import { loadConfig, type BrownieConfig } from '../config.js';
import { generateSwift } from '../generators/swift.js';
import { generateKotlin } from '../generators/kotlin.js';
import { discoverStores, type DiscoveredStore } from '../store-discovery.js';
import { Platform } from '../types.js';
import { intro, logger, outro } from '@rock-js/tools';
import { QuickTypeError } from 'quicktype-core';

function getOutputPath(dir: string, name: string, ext: string): string {
  return path.join(dir, `${name}.${ext}`);
}

function formatQuickTypeError(error: QuickTypeError): string {
  let message = error.errorMessage;
  for (const [key, value] of Object.entries(error.properties)) {
    message = message.replaceAll('${' + key + '}', value);
  }

  return message;
}

async function generateForStore(
  store: DiscoveredStore,
  config: BrownieConfig,
  platforms: Platform[],
  showLabel: boolean
): Promise<void> {
  const { name, schemaPath } = store;
  const storeLabel = showLabel ? ` [${name}]` : '';

  logger.info(`Generating types for store ${name}`);

  for (const p of platforms) {
    const outputDir = config[p];
    if (!outputDir) {
      continue;
    }

    const ext = p === 'swift' ? 'swift' : 'kt';
    const outputPath = getOutputPath(outputDir, name, ext);

    try {
      if (p === 'swift') {
        await generateSwift({
          name,
          schemaPath,
          typeName: name,
          outputPath,
        });
      } else {
        await generateKotlin({
          name,
          schemaPath,
          typeName: name,
          outputPath,
          packageName: config.kotlinPackageName,
        });
      }
      logger.success(
        `Generated ${outputPath}${styleText('italic', storeLabel)}`
      );
    } catch (error) {
      logger.error(
        `Error generating ${p}${storeLabel}: ${error instanceof QuickTypeError ? formatQuickTypeError(error) : error instanceof Error ? error.message : error}`
      );
      process.exit(1);
    }
  }
}

export type RunCodegenOptions = { platform?: Platform };

/**
 * Runs the codegen command with the given arguments.
 */
export async function runCodegen({ platform }: RunCodegenOptions) {
  intro(
    `Running brownie codegen for ${platform ? `platform ${platform}` : 'all platforms'}`
  );

  const config = loadConfig();

  if (platform && !['swift', 'kotlin'].includes(platform)) {
    logger.error(`Invalid platform: ${platform}. Must be 'swift' or 'kotlin'`);
    process.exit(1);
  }

  const stores = discoverStores();
  const isMultipleStores = stores.length > 1;
  const schemaList = stores.map((s) => path.basename(s.schemaPath)).join(', ');

  logger.info(
    styleText('cyan', `Generating store types from ${schemaList}...`)
  );

  for (const store of stores) {
    const platforms: Platform[] = platform
      ? [platform]
      : (['swift', 'kotlin'] as Platform[]).filter((p) => config[p]);

    if (platforms.length === 0) {
      logger.warn(`No output paths configured for store ${store.name}`);
      continue;
    }

    await generateForStore(store, config, platforms, isMultipleStores);
  }

  outro('Done!');
}

export const codegenCommand = new Command('codegen')
  .description('Generate native store types from TypeScript schema')
  .addOption(
    new Option(
      '-p, --platform <platform>',
      'Generate for specific platform (swift, kotlin)'
    ).choices(['swift', 'kotlin'])
  )
  .action(
    actionRunner(async (options: RunCodegenOptions) => {
      await runCodegen(options);
    })
  );
