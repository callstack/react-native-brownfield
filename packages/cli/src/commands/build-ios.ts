import fs from 'fs';
// import path from 'path';
import {execSync} from 'child_process';
import {BuildArtifact} from '../types';

export default function buildArtifact({entryFile}: BuildArtifact) {
  const buildDir = `${process.cwd()}/build/brownfield`;

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, {recursive: true});
  }

  // const libraryPath = path.join(
  //   path.dirname(require.resolve('@react-native-brownfield/cli')),
  //   '..',
  // );

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
