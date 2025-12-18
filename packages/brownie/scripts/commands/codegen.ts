import { parseArgs, styleText } from 'node:util';
import { loadConfig, type StoresConfig } from '../config';
import { generateSwift } from '../generators/swift';
import { generateKotlin } from '../generators/kotlin';

type Platform = 'swift' | 'kotlin';

async function generateForStore(
  config: StoresConfig,
  platforms: Platform[],
  storeIndex?: number
): Promise<void> {
  const storeLabel = storeIndex !== undefined ? ` [${config.typeName}]` : '';

  for (const p of platforms) {
    const outputPath = config[p];
    if (!outputPath) {
      continue;
    }

    try {
      if (p === 'swift') {
        await generateSwift({
          schemaPath: config.schema,
          typeName: config.typeName,
          outputPath,
        });
      } else {
        await generateKotlin({
          schemaPath: config.schema,
          typeName: config.typeName,
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
  ${styleText('dim', 'brownie codegen')}                  Generate for all configured platforms
  ${styleText('dim', 'brownie codegen -p swift')}         Generate Swift only
  ${styleText('dim', 'brownie codegen --platform kotlin')} Generate Kotlin only
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

  const configs = loadConfig();
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

  const isMultipleStores = configs.length > 1;
  const schemaList = configs.map((c) => c.schema).join(', ');
  console.log(
    styleText('cyan', `Generating store types from ${schemaList}...`)
  );

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const platforms: Platform[] = platform
      ? [platform]
      : (['swift', 'kotlin'] as Platform[]).filter((p) => config[p]);

    if (platforms.length === 0) {
      console.warn(
        styleText(
          'yellow',
          `No output paths configured for store ${config.typeName}`
        )
      );
      continue;
    }

    await generateForStore(config, platforms, isMultipleStores ? i : undefined);
  }

  console.log(styleText('green', '\nDone!'));
}
