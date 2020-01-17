import {BuildPlatform} from '../types';
import {createBuildDir, bundleJS, getBuildDir} from '../tools/helpers';

export default function buildAndroid(args: BuildPlatform) {
  const rootDir = process.cwd();
  const buildDir = getBuildDir(rootDir);

  createBuildDir(buildDir);

  bundleJS({
    ...args,
    platform: 'android',
    rootDir,
    buildDir,
  });
}
