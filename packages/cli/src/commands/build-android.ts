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
  const copyDir = args.outputDir ? `${rootDir}/${args.outputDir}` : rootDir;

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
      `cd ${buildDir}/android && ./gradlew bundleReleaseAar -x bundleReleaseJsAndAssets`,
    );
    console.log(result.toString());
  } catch (e) {
    console.error(e);
    return;
  }

  try {
    execSync(
      `mkdir -p ${copyDir} && mv ${buildDir}/android/react-native-brownfield/build/outputs/aar/react-native-brownfield.aar ${copyDir}`,
    );
  } catch (e) {
    console.log(e);
  }
}
