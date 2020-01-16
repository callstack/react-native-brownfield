import {execSync} from 'child_process';
import {BuildPlatform} from '../types';
import {createBuildDir, bundleJS, getBuildDir} from '../tools/helpers';

export default async function buildIOS(args: BuildPlatform) {
  const rootDir = process.cwd();
  const buildDir = getBuildDir(rootDir);

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
    console.log(e);
    return;
  }

  try {
    const result = execSync('pod install');
    console.log(result.toString());
  } catch (e) {
    console.error(e);
    return;
  }

  try {
    const result = execSync(
      'xcodebuild -workspace ReactNativeBrownfield.xcworkspace -scheme ReactNativeBrownfield -sdk iphoneos -derivedDataPath build',
    );
    console.log(result.toString());
    execSync('popd');
  } catch (e) {
    console.error(e);
    return;
  }
}
