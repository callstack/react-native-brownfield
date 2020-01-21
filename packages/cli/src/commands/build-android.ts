import path from 'path';
import {execSync} from 'child_process';
import {BuildPlatform} from '../types';
import copyFiles from '../tools/copyFiles';
import {createBuildDir, bundleJS, getBuildDir} from '../tools/helpers';

export default async function buildAndroid(args: BuildPlatform) {
  const rootDir = process.cwd();
  const buildDir = getBuildDir(rootDir);
  const libraryPath = path.join(
    path.dirname(require.resolve('@react-native-brownfield/cli')),
    'android',
  );

  createBuildDir(buildDir);

  bundleJS({
    ...args,
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

  try {
    const result = execSync(
      './gradlew bundleReleaseAar -x bundleReleaseJsAndAssets',
    );
    console.log(result.toString());
  } catch (e) {
    console.error(e);
    return;
  }
}
