import path from 'node:path';
import fs, { globSync } from 'node:fs';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

// arg parser
import yargs from 'yargs';

const { appName } = yargs(process.argv.slice(2))
  .usage('prepareXCFrameworks --appName <appName>')
  .demandOption('appName', 'App name is required, pass it as an argument')
  .parse();

import { intro, outro, logger } from '@rock-js/tools';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

intro(`Preparing XCFrameworks for ${appName}`);

if (!appName) {
  throw new Error('App name is required, pass it as an argument');
}

const appPath = path.join(__dirname, '..', appName);

if (!fs.existsSync(appPath)) {
  throw new Error('Invalid app name, this app does not exist');
}

const sourcePackagePath = path.join(
  appPath,
  'ios',
  '.brownfield',
  'package',
  'build'
);

const targetPackagePath = path.join(__dirname, 'package');

if (fs.existsSync(targetPackagePath)) {
  logger.info(`Removing ${targetPackagePath}\n`);
  fs.rmSync(targetPackagePath, { recursive: true });
}

logger.info(`Copying ${sourcePackagePath} to ${targetPackagePath}\n`);
fs.cpSync(sourcePackagePath, targetPackagePath, { recursive: true });

/**
 * The Xcode project is configured to link the following frameworks:
 * - BrownfieldLib (constant)
 * - Brownie (constant)
 * - hermesvm <- this changes depending on RN version: for RN < 0.82 it's hermes.xcframework, for RN >= 0.82 it's hermesvm.xcframework
 * - ReactBrownfield (constant)
 *
 * The trick is to rename the artifacts to match the Xcode project configuration.
 */

// handle hermesvm.xcframework / hermes.xcframework
let hermesArtifactFound = false;
for (const candidateDir of ['hermes.xcframework', 'hermesvm.xcframework']) {
  if (fs.existsSync(path.join(targetPackagePath, candidateDir))) {
    fs.renameSync(
      path.join(targetPackagePath, candidateDir),
      path.join(targetPackagePath, 'hermesvm.xcframework')
    );
    hermesArtifactFound = true;
  }
}

if (!hermesArtifactFound) {
  throw new Error('Hermes artifact not found');
}

// list files
const validNames = [
  'BrownfieldLib.xcframework',
  'Brownie.xcframework',
  'hermesvm.xcframework',
  'ReactBrownfield.xcframework',
];

for (const file of fs.readdirSync(targetPackagePath)) {
  if (!validNames.includes(file)) {
    throw new Error(`Invalid file name: ${file}`);
  }

  logger.success(`${file} prepared`);
}

logger.info('Patching entrypoint name in ContentView.swift');
const filePath = path.join(
  __dirname,
  'Brownfield Apple App',
  'components',
  'ContentView.swift'
);
const contentViewFileContents = fs.readFileSync(filePath, 'utf8');
const moduleNameRegex = /moduleName: ".*"/g;

if (!contentViewFileContents.match(moduleNameRegex)) {
  throw new Error('moduleName not found in ContentView.swift');
}

const isVanillaApp = appName === 'RNApp';

let updatedContentViewFileContents = contentViewFileContents.replace(
  moduleNameRegex,
  `moduleName: "${
    isVanillaApp ? 'RNApp' : 'main' // default to main for Expo apps
  }"`
);

logger.success(`Entrypoint name patched in ${filePath}`);

logger.info('Patching GreetingCard name in ContentView.swift');

// replace GreetingCard(name: "...") with GreetingCard(name: "${appName}")
const greetingCardNameRegex = /GreetingCard\(name: ".*"/g;
if (!updatedContentViewFileContents.match(greetingCardNameRegex)) {
  throw new Error('GreetingCard name not found in ContentView.swift');
}

updatedContentViewFileContents = updatedContentViewFileContents.replace(
  greetingCardNameRegex,
  `GreetingCard(name: "iOS ${isVanillaApp ? 'Vanilla' : 'Expo'}"`
);

fs.writeFileSync(filePath, updatedContentViewFileContents);

outro(`Done!`);
