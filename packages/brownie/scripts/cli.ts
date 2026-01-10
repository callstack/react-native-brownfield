#!/usr/bin/env node

import { parseArgs, styleText } from 'node:util';
import fs from 'fs';
import path from 'path';

const packageJsonPath = path.resolve(__dirname, '../../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const HELP_TEXT = `
${styleText('bold', 'brownie')} - Shared state management CLI for React Native Brownfield

${styleText('yellow', 'Usage:')}
  brownie <command> [options]

${styleText('yellow', 'Startup:')}
  ${styleText('cyan', '-h, --help')}     Show help
  ${styleText('cyan', '-v, --version')}  Show version

${styleText('yellow', 'Commands:')}
  ${styleText('cyan', 'codegen')}        Generate native store types from TypeScript schema

${styleText('yellow', 'Examples:')}
  ${styleText('dim', 'brownie codegen')}                  Generate for all platforms
  ${styleText('dim', 'brownie codegen -p swift')}         Generate Swift only
  ${styleText('dim', 'brownie codegen --platform kotlin')} Generate Kotlin only
`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  strict: false,
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
  },
});

if (values.version) {
  console.log(packageJson.version);
  process.exit(0);
}

if (values.help && positionals.length === 0) {
  console.log(HELP_TEXT);
  process.exit(0);
}

if (positionals.length === 0) {
  console.log(HELP_TEXT);
  process.exit(0);
}

const [command] = positionals;

async function main() {
  switch (command) {
    case 'codegen': {
      const codegen = await import('./commands/codegen');
      await codegen.runCodegen(process.argv.slice(3), packageJson.version);
      break;
    }
    default:
      console.error(styleText('red', `Unknown command: ${command}`));
      console.log(HELP_TEXT);
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    styleText('red', error instanceof Error ? error.message : String(error))
  );
  process.exit(1);
});
