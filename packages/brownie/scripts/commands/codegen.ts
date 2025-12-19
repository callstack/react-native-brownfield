import path from 'node:path';
import { parseArgs, styleText } from 'node:util';
import { loadConfig, type BrownieConfig } from '../config';
import { generateSwift } from '../generators/swift';
import { generateKotlin } from '../generators/kotlin';
import { discoverStores, type DiscoveredStore } from '../store-discovery';

type Platform = 'swift' | 'kotlin';

function getOutputPath(dir: string, name: string, ext: string): string {
  return path.join(dir, `${name}.${ext}`);
}

async function generateForStore(
  store: DiscoveredStore,
  config: BrownieConfig,
  platforms: Platform[],
  showLabel: boolean
): Promise<void> {
  const { name, schemaPath } = store;
  const storeLabel = showLabel ? ` [${name}]` : '';

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
      console.log(styleText('green', `  ✓ ${outputPath}${storeLabel}`));
    } catch (error) {
      console.error(
        styleText(
          'red',
          `Error generating ${p}${storeLabel}: ${error instanceof Error ? error.message : error}`
        )
      );
      process.exit(1);
    }
  }
}

const HELP_TEXT = `
${styleText('bold', 'brownie codegen')} - Generate native store types from TypeScript schema

${styleText('yellow', 'Usage:')}
  brownie codegen [options]

${styleText('yellow', 'Startup:')}
  ${styleText('cyan', '-h, --help')}                 Show help
  ${styleText('cyan', '-v, --version')}              Show version

${styleText('yellow', 'Options:')}
  ${styleText('cyan', '-p, --platform <platform>')}  Generate for specific platform (swift, kotlin)

${styleText('yellow', 'Examples:')}
  ${styleText('dim', 'brownie codegen')}                      Generate for all configured platforms
  ${styleText('dim', 'brownie codegen -p swift')}             Generate Swift only
  ${styleText('dim', 'brownie codegen --platform kotlin')}    Generate Kotlin only
`;

/**
 * Runs the codegen command with the given arguments.
 */
export async function runCodegen(
  args: string[],
  version: string
): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      platform: { type: 'string', short: 'p' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });

  if (values.version) {
    console.log(version);
    return;
  }

  if (values.help) {
    console.log(HELP_TEXT);
    return;
  }

  const config = loadConfig();
  const platform = values.platform as Platform | undefined;

  if (platform && !['swift', 'kotlin'].includes(platform)) {
    console.error(
      styleText(
        'red',
        `Invalid platform: ${platform}. Must be 'swift' or 'kotlin'`
      )
    );
    process.exit(1);
  }

  const stores = discoverStores();
  const isMultipleStores = stores.length > 1;
  const schemaList = stores.map((s) => path.basename(s.schemaPath)).join(', ');
  console.log(
    styleText('cyan', `Generating store types from ${schemaList}...`)
  );

  for (const store of stores) {
    const platforms: Platform[] = platform
      ? [platform]
      : (['swift', 'kotlin'] as Platform[]).filter((p) => config[p]);

    if (platforms.length === 0) {
      console.warn(
        styleText(
          'yellow',
          `No output paths configured for store ${store.name}`
        )
      );
      continue;
    }

    await generateForStore(store, config, platforms, isMultipleStores);
  }

  console.log(styleText('green', '\nDone!'));
}
