import path from 'path';
import {execSync} from 'child_process';
import copyFiles from '../tools/copyFiles';
import {BuildPlatform} from '../types';
import {createBuildDir, bundleJS, getBuildDir} from '../tools/helpers';

export default async function buildArtifact(args: BuildPlatform) {
  const rootDir = process.cwd();
  const buildDir = getBuildDir(rootDir);
  const libraryPath = path.join(
    path.dirname(require.resolve('@react-native-brownfield/cli')),
    'ios',
  );

  createBuildDir(buildDir);

  bundleJS({
    ...args,
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

  try {
    const result = execSync(`cd ${buildDir}/ios && pod install`);
    console.log(result.toString());
  } catch (e) {
    console.error(e);
    return;
  }

  try {
    const result = execSync(
      `cd ${buildDir}/ios && xcodebuild -workspace ReactNativeBrownfield.xcworkspace -scheme ReactNativeBrownfield -sdk iphoneos -derivedDataPath build`,
    );
    console.log(result);
  } catch (e) {
    console.error(e);
    return;
  }

  const copyDir = args.outputDir ? `${rootDir}/${args.outputDir}` : rootDir;

  try {
    execSync(
      `cp -r ${buildDir}/ios/build/Build/Products/Release-iphoneos/ReactNativeBrownfield.framework ${copyDir}/ReactNativeBrownfield.framework`,
    );
  } catch (e) {
    console.log(e);
  }
}