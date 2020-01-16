import fs from 'fs';
// import path from 'path';
import {execSync} from 'child_process';
import {BuildArtifact} from '../types';
import findUp from 'find-up';

export default async function buildArtifact({
  entryFile,
  useNpm,
}: BuildArtifact) {
  const rootDir = process.cwd();
  const buildDir = `${rootDir}/build/brownfield`;

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, {recursive: true});
  }

  const packageManagerCmd =
    useNpm || (await isProjectUsingNpm(rootDir))
      ? 'node node_modules/.bin/react-native'
      : 'yarn react-native';

  try {
    const result = execSync(
      `${packageManagerCmd} bundle --platform ios --dev false --entry-file ${entryFile} --bundle-output ${buildDir}/main.jsbundle --assets-dest ${buildDir}`,
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

export function isProjectUsingNpm(cwd: string) {
  return findUp.exists(`${cwd}/package-lock.json`);
}
