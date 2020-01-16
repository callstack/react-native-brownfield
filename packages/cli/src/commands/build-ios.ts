import fs from 'fs';
import path from 'path';
import {execSync} from 'child_process';
import copyFiles from '../tools/copyFiles';
import {BuildArtifact} from '../types';

export default async function buildArtifact({entryFile}: BuildArtifact) {
  const buildDir = `${process.cwd()}/build/brownfield`;
  const libraryPath = path.join(
    path.dirname(require.resolve('@react-native-brownfield/cli')),
    '..',
    'ios',
  );

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, {recursive: true});
  }

  try {
    await copyFiles(libraryPath, `${buildDir}/ios`);
  } catch (e) {
    console.log(e);
    return;
  }

  try {
    const result = execSync(
      `yarn react-native bundle --platform ios --dev false --entry-file ${entryFile} --bundle-output ${buildDir}/main.jsbundle --assets-dest ${buildDir}`,
    );
    console.log(result.toString());
  } catch (e) {
    console.error(e);
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
