import fs from 'fs';
import {execSync} from 'child_process';
import {BundleJSArgs} from '../types';
import findUp from 'find-up';

export function createBuildDir(buildDir: string) {
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, {recursive: true});
  }
}

export async function bundleJS({
  rootDir,
  useNpm,
  platform,
  entryFile,
  buildDir,
}: BundleJSArgs) {
  const packageManagerCmd =
    useNpm || (await isProjectUsingNpm(rootDir))
      ? 'node node_modules/.bin/react-native'
      : 'yarn react-native';

  try {
    const result = execSync(
      `${packageManagerCmd} bundle --platform ${platform} --dev false --entry-file ${entryFile} --bundle-output ${buildDir}/main.jsbundle --assets-dest ${buildDir}/js`,
    );
    console.log(result.toString());
  } catch (e) {
    console.error(e);
    return;
  }
}

export function isProjectUsingNpm(cwd: string) {
  return findUp.exists(`${cwd}/package-lock.json`);
}

export function getBuildDir(rootDir: string) {
  return `${rootDir}/build/brownfield`;
}
