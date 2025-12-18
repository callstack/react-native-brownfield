import { parseArgs, styleText } from 'node:util';
import { loadConfig } from '../config';
import { generateSwift } from '../generators/swift';
import { generateKotlin } from '../generators/kotlin';

type Platform = 'swift' | 'kotlin';

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

  const platforms: Platform[] = platform
    ? [platform]
    : (['swift', 'kotlin'] as Platform[]).filter((p) => config[p]);

  if (platforms.length === 0) {
    console.error(
      styleText('red', 'No output paths configured in brownie.stores')
    );
    process.exit(1);
  }

  console.log(
    styleText('cyan', `Generating store types from ${config.schema}...`)
  );

  for (const p of platforms) {
    const outputPath = config[p];
    if (!outputPath) {
      console.warn(
        styleText('yellow', `Skipping ${p}: no output path configured`)
      );
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
      console.log(styleText('green', `  ✓ ${outputPath}`));
    } catch (error) {
      console.error(
        styleText(
          'red',
          `Error generating ${p}: ${error instanceof Error ? error.message : error}`
        )
      );
      process.exit(1);
    }
  }

  console.log(styleText('green', '\nDone!'));
}
