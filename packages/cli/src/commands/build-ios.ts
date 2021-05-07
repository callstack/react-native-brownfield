import path from 'path';
import {execSync, spawn} from 'child_process';
// @ts-ignore replace logger
import {logger} from '@react-native-community/cli-tools';
import copyFiles from '../tools/copyFiles';
import {BuildCommandArgs} from '../types';
import {
  createBuildDir,
  bundleJavaScript,
  getBuildDir,
  spawnCommand,
} from '../tools/helpers';

export default async function buildArtifact({
  entryFile,
  useNpm = false,
  // outputDir,
  verbose = true,
}: BuildCommandArgs) {
  logger.setVerbose(verbose);
  const rootDir = process.cwd();
  const buildDir = getBuildDir(rootDir);
  const libraryPath = path.join(
    path.dirname(require.resolve('@react-native-brownfield/cli')),
    'ios',
  );

  createBuildDir(buildDir);

  await bundleJavaScript({
    entryFile,
    useNpm,
    platform: 'ios',
    rootDir,
    buildDir,
  });

  try {
    await copyFiles(libraryPath, `${buildDir}/ios`);
  } catch (e) {
    console.error(e);
    return;
  }

  await installPods({rootDir: buildDir});

  await buildFramework({
    rootDir: buildDir,
    target: 'iphoneos',
    debug: false,
  });

  await buildFramework({
    rootDir: buildDir,
    target: 'iphonesimulator',
    debug: false,
  });

  // await cleanOldFramework({ buildDir });

  await mergeFrameworks({
    rootDir: buildDir,
    buildDir,
    debug: false,
  });

  logger.success('Done: Building iOS Artifact');
}

function isXcprettyAvailable() {
  try {
    execSync('xcpretty --version', {
      stdio: [0, 'pipe', 'ignore'],
    });
  } catch (error) {
    return false;
  }
  return true;
}

async function installPods({rootDir}: {rootDir: string}) {
  const result = await spawnCommand({
    command: 'pod install',
    args: [],
    taskDescription: 'Installing CocoaPods',
    cwd: `${rootDir}/ios`,
  });
  logger.success(result);
}

type BuildFrameworkArgs = {
  rootDir: string;
  target: string;
  debug: boolean;
};

async function buildFramework({rootDir, target, debug}: BuildFrameworkArgs) {
  const xcpretty =
    isXcprettyAvailable() &&
    spawn('xcpretty', [], {
      stdio: ['pipe', process.stdout, process.stderr],
    });

  const result = await spawnCommand({
    command: 'xcodebuild',
    args: [
      '-workspace',
      'ReactNativeBrownfield.xcworkspace',
      '-scheme',
      'ReactNativeBrownfield',
      '-sdk',
      target,
      '-derivedDataPath',
      'build',
      '-configuration',
      debug ? 'Debug' : 'Release',
    ],
    taskDescription: `Building iOS framework for ${target}`,
    cwd: `${rootDir}/ios`,
    customOnDataCallback:
      xcpretty && logger.isVerbose()
        ? (data) => {
            xcpretty.stdin.write(data);
          }
        : undefined,
    customOnCloseCallback:
      xcpretty && logger.isVerbose()
        ? () => {
            xcpretty.stdin.end();
          }
        : undefined,
  });
  logger.success(result);
}

// async function cleanOldFramework({buildDir}) {
//   const result = await spawnCommand({
//     command: 'rm',
//     args: ['-rf', 'ReactNativeBrownfield.xcframework'],
//     taskDescription: 'Removing old xcframeworks',
//     cwd: buildDir,
//   });
//   logger.success(result);
// }

type MergeFrameworksArgs = {
  rootDir: string;
  buildDir: string;
  debug: boolean;
};

async function mergeFrameworks({
  rootDir,
  buildDir,
  debug,
}: MergeFrameworksArgs) {
  const result = await spawnCommand({
    command: 'xcodebuild',
    args: [
      '-create-xcframework',
      '-framework',
      `${rootDir}/ios/build/Build/Products/${
        debug ? 'Debug' : 'Release'
      }-iphoneos/ReactNativeBrownfield.framework`,
      '-framework',
      `${rootDir}/ios/build/Build/Products/${
        debug ? 'Debug' : 'Release'
      }-iphonesimulator/ReactNativeBrownfield.framework`,
      '-output',
      `${buildDir}/ReactNativeBrownfield.xcframework`,
    ],
    taskDescription: 'Creating universal framework',
    cwd: rootDir,
  });
  logger.success(result);
}
