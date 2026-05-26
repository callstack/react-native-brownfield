import path from 'node:path';
import { styleText } from 'node:util';

import { Command, Option } from 'commander';

import { intro, logger, outro } from '@rock-js/tools';
import { QuickTypeError } from 'quicktype-core';
import { actionRunner } from '../../shared/index.js';
import {
  hasLegacyConfig,
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

export type RunCodegenOptions = {
  platform?: Platform;
  brownie?: BrownieConfig;
};

/**
 * Runs the codegen command with the given arguments.
 */
export async function runCodegen({ platform, brownie }: RunCodegenOptions) {
  intro(
    `Running Brownie codegen for ${platform ? `platform ${platform}` : 'all platforms'}`
  );

  const legacyConfig = hasLegacyConfig() ? loadConfig() : undefined;

  if (legacyConfig && brownie) {
    throw new Error(
      'Cannot use both legacy and new Brownie configuration formats simultaneously. Please migrate to the new configuration format and remove legacy configuration files: https://oss.callstack.com/react-native-brownfield/docs/api-reference/configuration#migrating-from-legacy-brownie-configuration'
    );
  }

  if (legacyConfig) {
    logger.warn(
      'You are using legacy Brownie configuration. Please migrate to the new configuration format. See the documentation for more details: https://oss.callstack.com/react-native-brownfield/docs/api-reference/configuration#migrating-from-legacy-brownie-configuration'
    );
  }

  const config = brownie || legacyConfig || {};

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
        // Generate both Swift and Kotlin by default
        platforms = ['swift', 'kotlin'];
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

  outro('Brownie codegen done');
}

export const codegenCommand = new Command('codegen')
  .description('Generate native store types from TypeScript schema')
  .addOption(
    new Option(
      '-p, --platform <platform>',
      'Generate for specific platform (swift|kotlin)'
    ).choices(['swift', 'kotlin'])
  )
  .action(
    actionRunner(async (options: RunCodegenOptions) => {
      await runCodegen(options);
    })
  );
