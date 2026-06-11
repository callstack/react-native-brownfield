import path from 'node:path';
import fs from 'node:fs';

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

/**
 * The Xcode project is configured to link the following frameworks:
 * - BrownfieldLib (constant)
 * - Brownie (constant)
 * - hermesvm <- this changes depending on RN version: for RN < 0.82 it's hermes.xcframework, for RN >= 0.82 it's hermesvm.xcframework
 * - ReactBrownfield (constant)
 * The trick is to rename the artifacts to match the Xcode project configuration.
 *
 * Brownfield versions >= 3.7.0 support RN Apple prebuilts.
 * RN 0.83 (oldest supported by Brownfield v3) ships opt-in support (first in 0.81), which can be opted-in for via `--use-prebuilt-rn-core` flag.
 * RN >= 0.84 ships prebuilts by default, therefore Brownfield enables them in packaging by default for RN >= 0.84.
 *
 */

const validNames = [
  'BrownfieldLib.xcframework',
  'Brownie.xcframework',
  'hermesvm.xcframework',
  'ReactBrownfield.xcframework',
  'BrownfieldNavigation.xcframework',
  // below: optional, emitted when RN is packaged with prebuilt iOS pods
  'React.xcframework',
  'ReactAppDependencyProvider.xcframework',
  'ReactNativeDependencies.xcframework',
];

if (fs.existsSync(targetPackagePath)) {
  logger.info(`Removing ${targetPackagePath}\n`);
  fs.rmSync(targetPackagePath, { recursive: true, force: true });
}

logger.info(
  `Copying XCFrameworks from ${sourcePackagePath} to ${targetPackagePath}\n`
);
fs.mkdirSync(targetPackagePath, { recursive: true });

const spmArtifactsPath = path.join(sourcePackagePath, 'spm-artifacts');
const preferredArtifactSourcePath = fs.existsSync(spmArtifactsPath)
  ? spmArtifactsPath
  : sourcePackagePath;

for (const file of fs.readdirSync(preferredArtifactSourcePath)) {
  if (
    !validNames.includes(file) &&
    !['hermes.xcframework', 'hermesvm.xcframework'].includes(file)
  ) {
    continue;
  }

  fs.cpSync(
    path.join(preferredArtifactSourcePath, file),
    path.join(targetPackagePath, file),
    {
      recursive: true,
    }
  );
}

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

for (const file of fs.readdirSync(targetPackagePath)) {
  if (!validNames.includes(file)) {
    throw new Error(`Invalid file name: ${file}`);
  }

  logger.success(`${file} prepared`);
}

outro(`Done!`);
