import fs from 'fs';
import path from 'path';
import {execSync} from 'child_process';
import {BuildArtifact} from '@react-native-brownfield/cli-types';

export default function buildArtifact({entryFile}: BuildArtifact) {
  const buildDir = process.cwd();
  console.log(__dirname);

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
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
    execSync(
      `pushd ${path.resolve(
        './node_modules/@react-native-brownfield/cli/ios',
      )}`,
    );
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
