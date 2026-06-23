import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

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
const inputFileListPath = path.join(
  targetPackagePath,
  'embed-framework-inputs.xcfilelist'
);
const outputFileListPath = path.join(
  targetPackagePath,
  'embed-framework-outputs.xcfilelist'
);

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
const xcodeManagedFrameworks = new Set([
  'BrownfieldLib.xcframework',
  'BrownfieldNavigation.xcframework',
  'Brownie.xcframework',
  'React.xcframework',
  'ReactBrownfield.xcframework',
  'ReactNativeDependencies.xcframework',
  'hermesvm.xcframework',
]);

const listFrameworkOutputs = (frameworkPath, destinationRoot) => {
  const outputs = new Set([destinationRoot]);

  const walk = (sourcePath, destinationPath) => {
    outputs.add(destinationPath);

    for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
      const childSourcePath = path.join(sourcePath, entry.name);
      const childDestinationPath = path.join(destinationPath, entry.name);

      outputs.add(childDestinationPath);

      if (entry.isDirectory()) {
        walk(childSourcePath, childDestinationPath);
      }
    }
  };

  walk(frameworkPath, destinationRoot);
  outputs.add(path.join(destinationRoot, '_CodeSignature'));
  outputs.add(path.join(destinationRoot, '_CodeSignature', 'CodeRequirements'));
  outputs.add(path.join(destinationRoot, '_CodeSignature', 'CodeResources'));

  return outputs;
};

const isDynamicFrameworkBinary = (binaryPath) => {
  const output = execFileSync('file', [binaryPath], {
    encoding: 'utf8',
  });

  return output.includes('dynamically linked shared library');
};

const findEmbeddableFrameworkBinary = (xcframeworkPath) => {
  const infoPlistPath = path.join(xcframeworkPath, 'Info.plist');
  const info = JSON.parse(
    execFileSync('plutil', ['-convert', 'json', '-o', '-', infoPlistPath], {
      encoding: 'utf8',
    })
  );

  for (const library of info.AvailableLibraries ?? []) {
    const binaryPath = path.join(
      xcframeworkPath,
      library.LibraryIdentifier,
      library.BinaryPath
    );

    if (fs.existsSync(binaryPath) && isDynamicFrameworkBinary(binaryPath)) {
      return binaryPath;
    }
  }

  return null;
};

const shouldCopyFramework = (frameworkName, frameworkPath) =>
  xcodeManagedFrameworks.has(frameworkName) ||
  findEmbeddableFrameworkBinary(frameworkPath) !== null;

for (const file of fs.readdirSync(preferredArtifactSourcePath)) {
  const sourcePath = path.join(preferredArtifactSourcePath, file);

  if (
    !fs.statSync(sourcePath).isDirectory() ||
    !file.endsWith('.xcframework')
  ) {
    continue;
  }

  if (!shouldCopyFramework(file, sourcePath)) {
    continue;
  }

  fs.cpSync(
    sourcePath,
    path.join(targetPackagePath, file),
    {
      recursive: true,
    }
  );
}

// handle hermesvm.xcframework / hermes.xcframework
let hermesArtifactFound = false;
if (fs.existsSync(path.join(targetPackagePath, 'hermesvm.xcframework'))) {
  hermesArtifactFound = true;
}

if (fs.existsSync(path.join(targetPackagePath, 'hermes.xcframework'))) {
  if (hermesArtifactFound) {
    fs.rmSync(path.join(targetPackagePath, 'hermes.xcframework'), {
      recursive: true,
      force: true,
    });
  } else {
    fs.renameSync(
      path.join(targetPackagePath, 'hermes.xcframework'),
      path.join(targetPackagePath, 'hermesvm.xcframework')
    );
    hermesArtifactFound = true;
  }
}

if (!hermesArtifactFound) {
  throw new Error('Hermes artifact not found');
}

for (const file of fs.readdirSync(targetPackagePath)) {
  if (!file.endsWith('.xcframework')) {
    throw new Error(`Invalid file name: ${file}`);
  }

  logger.success(`${file} prepared`);
}

const preparedFrameworks = fs
  .readdirSync(targetPackagePath)
  .filter((file) => file.endsWith('.xcframework'))
  .sort();
const additionalFrameworks = preparedFrameworks.filter(
  (file) =>
    !xcodeManagedFrameworks.has(file) &&
    findEmbeddableFrameworkBinary(path.join(targetPackagePath, file))
);

fs.writeFileSync(
  inputFileListPath,
  additionalFrameworks
    .map((file) => path.join(targetPackagePath, file))
    .join('\n') + '\n'
);

const outputPaths = new Set();

for (const file of additionalFrameworks) {
  const xcframeworkPath = path.join(targetPackagePath, file);
  const slices = fs.readdirSync(xcframeworkPath, { withFileTypes: true });

  for (const slice of slices) {
    if (!slice.isDirectory()) {
      continue;
    }

    const slicePath = path.join(xcframeworkPath, slice.name);
    const frameworkName = fs
      .readdirSync(slicePath)
      .find((entry) => entry.endsWith('.framework'));

    if (!frameworkName) {
      continue;
    }

    const frameworkPath = path.join(slicePath, frameworkName);
    const destinationRoot = path.join(
      '$(TARGET_BUILD_DIR)',
      '$(FRAMEWORKS_FOLDER_PATH)',
      frameworkName
    );

    for (const outputPath of listFrameworkOutputs(
      frameworkPath,
      destinationRoot
    )) {
      outputPaths.add(outputPath);
    }
  }
}

fs.writeFileSync(
  outputFileListPath,
  Array.from(outputPaths).sort().join('\n') + '\n'
);

outro(`Done!`);
