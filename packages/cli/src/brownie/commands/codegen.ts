import path from 'node:path';
import { styleText } from 'node:util';

import { Command, Option } from 'commander';

import { intro, logger, outro } from '@rock-js/tools';
import { QuickTypeError } from 'quicktype-core';
import { actionRunner } from '../../shared/index.js';
import {
  loadConfig,
  getSwiftOutputPath,
  type BrownieConfig,
} from '../config.js';
import { generateSwift } from '../generators/swift.js';
import { generateKotlin } from '../generators/kotlin.js';
import { discoverStores, type DiscoveredStore } from '../store-discovery.js';
import type { Platform } from '../types.js';
import { NoBrownieStoresError } from '../errors/NoBrownieStoresError.js';

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
    let outputPath: string;

    if (p === 'swift') {
      const swiftOutputDir = getSwiftOutputPath();
      outputPath = getOutputPath(swiftOutputDir, name, 'swift');
    } else {
      const kotlinOutputDir = config.kotlin;
      if (!kotlinOutputDir) {
        continue;
      }
      outputPath = getOutputPath(kotlinOutputDir, name, 'kt');
    }

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
    `Running Brownie codegen for ${platform ? `platform ${platform}` : 'all platforms'}`
  );

  const config = loadConfig();

  if (platform && !['swift', 'kotlin'].includes(platform)) {
    logger.error(`Invalid platform: ${platform}. Must be 'swift' or 'kotlin'`);
    process.exit(1);
  }

  try {
    const stores = discoverStores();
    const isMultipleStores = stores.length > 1;
    const schemaList = stores
      .map((s) => path.basename(s.schemaPath))
      .join(', ');

    logger.info(
      styleText('cyan', `Generating store types from ${schemaList}...`)
    );

    for (const store of stores) {
      let platforms: Platform[];

      if (platform) {
        platforms = [platform];
      } else {
        // Only generate Swift by default (Kotlin not yet released)
        platforms = ['swift'];
      }

      await generateForStore(store, config, platforms, isMultipleStores);
    }
  } catch (error) {
    if (error instanceof NoBrownieStoresError) {
      logger.error(error.message);
      outro('No brownie stores found, nothing was generated.');
      return;
    } else {
      throw error;
    }
  }

  outro('Done!');
}

export const codegenCommand = new Command('codegen')
  .description('Generate native store types from TypeScript schema')
  .addOption(
    new Option(
      '-p, --platform <platform>',
      'Generate for specific platform (swift)'
    ).choices(['swift'])
  )
  .action(
    actionRunner(async (options: RunCodegenOptions) => {
      await runCodegen(options);
    })
  );
