import path from 'path';
import {execSync} from 'child_process';
import copyFiles from '../tools/copyFiles';
import {BuildPlatform} from '../types';
import {createBuildDir, bundleJS, getBuildDir} from '../tools/helpers';

const tasks = {
  bundlingJs: 'bundling JS',
  business: 'serious business',
};

const {Worker} = require('worker_threads');

export default async function buildArtifact(args: BuildPlatform) {
  const uiService = new Worker('../../packages/cli/build/tools/uiService.js', {
    workerData: {
      task: tasks.bundlingJs,
      tasksCount: 2,
    },
  });

  uiService.on('message', q => console.log(666, q));

  const rootDir = process.cwd();
  const buildDir = getBuildDir(rootDir);
  const libraryPath = path.join(
    path.dirname(require.resolve('@react-native-brownfield/cli')),
    'ios',
  );

  createBuildDir(buildDir);
  await bundleJS({
    ...args,
    platform: 'ios',
    rootDir,
    buildDir,
  });

  uiService.postMessage({workerData: {task: tasks.business, tasksCount: 2}});
  // // progressBar.itemDone(tasks[0]);
  // try {
  //   await copyFiles(libraryPath, `${buildDir}/ios`);
  // } catch (e) {
  //   console.log(e);
  //   return;
  // }
  // try {
  //   const result = execSync(`cd ${buildDir}/ios && pod install`);
  //   // console.log(result.toString());
  // } catch (e) {
  //   console.error(e);
  //   return;
  // }
  // try {
  //   const result = execSync(
  //     `cd ${buildDir}/ios && xcodebuild -workspace ReactNativeBrownfield.xcworkspace -scheme ReactNativeBrownfield -sdk iphoneos -derivedDataPath build`,
  //   );
  //   // console.log(result.toString());
  // } catch (e) {
  //   console.error(e);
  //   return;
  // }
  // const copyDir = args.outputDir ? `${rootDir}/${args.outputDir}` : rootDir;
  // try {
  //   execSync(
  //     `cp -r ${buildDir}/ios/build/Build/Products/Release-iphoneos/ReactNativeBrownfield.framework ${copyDir}/ReactNativeBrownfield.framework`,
  //   );
  // } catch (e) {
  //   console.log(e);
  // }
}
