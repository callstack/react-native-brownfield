import path from 'path';
// @ts-ignore replace logger
import {logger} from '@react-native-community/cli-tools';
import {BuildCommandArgs} from '../types';
import copyFiles from '../tools/copyFiles';
import {
  createBuildDir,
  bundleJavaScript,
  getBuildDir,
  spawnCommand,
} from '../tools/helpers';

export default async function buildAndroid({
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
    'android',
  );

  createBuildDir(buildDir);

  await bundleJavaScript({
    entryFile,
    useNpm,
    platform: 'android',
    rootDir,
    buildDir,
  });

  try {
    await copyFiles(libraryPath, `${buildDir}/android`);
  } catch (e) {
    console.log(e);
    return;
  }

  await buildAar({rootDir, debug: false});

  logger.success('Done: Building Android Artifact');
  process.exit(0);
}

type BuildAarArgs = {
  rootDir: string;
  debug: boolean;
};

async function buildAar({rootDir, debug}: BuildAarArgs) {
  const result = await spawnCommand({
    command: `./gradlew bundle${debug ? 'Debug' : 'Release'}Aar`,
    args: ['-x', `bundle${debug ? 'Debug' : 'Release'}JsAndAssets`],
    taskDescription: 'Building .aar file',
    cwd: `${rootDir}/build/brownfield/android`,
  });
  logger.success(result);
}
