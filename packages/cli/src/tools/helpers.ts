import fs from 'fs';
import chalk from 'chalk';
import {spawn} from 'child_process';
// @ts-ignore replace logger
import {logger, CLIError} from '@react-native-community/cli-tools';
import {Platform} from '../types';
import findUp from 'find-up';

export function createBuildDir(buildDir: string) {
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, {recursive: true});
  }
}

export type BundleJavaScriptArgs = {
  entryFile: string;
  useNpm: boolean;
  platform: Platform;
  buildDir: string;
  rootDir: string;
};

export async function bundleJavaScript({
  rootDir,
  useNpm,
  platform,
  entryFile,
  buildDir,
}: BundleJavaScriptArgs) {
  const packageManagerCmd =
    useNpm || (await isProjectUsingNpm(rootDir))
      ? 'node node_modules/.bin/react-native'
      : 'yarn react-native';

  const platformBuildDir = `${buildDir}/${platform}`;

  if (platform === 'ios' && !fs.existsSync(platformBuildDir)) {
    fs.mkdirSync(platformBuildDir, {recursive: true});
  } else if (
    !fs.existsSync(`${platformBuildDir}/assets`) ||
    !fs.existsSync(`${platformBuildDir}/res`)
  ) {
    fs.mkdirSync(`${platformBuildDir}/assets`, {recursive: true});
    fs.mkdirSync(`${platformBuildDir}/res`, {recursive: true});
  }

  const bundleOutput =
    platform === 'ios'
      ? `${platformBuildDir}/main.jsbundle`
      : `${platformBuildDir}/assets/index.android.bundle`;

  const assetsDestination =
    platform === 'ios' ? platformBuildDir : `${platformBuildDir}/res`;

  const result = await spawnCommand({
    command: `${packageManagerCmd} bundle`,
    args: [
      '--platform',
      platform,
      '--dev',
      false,
      '--entry-file',
      entryFile,
      '--bundle-output',
      bundleOutput,
      '--assets-dest',
      assetsDestination,
    ],
    taskDescription: 'Bundling JavaScript',
    cwd: rootDir,
  });
  logger.success(result);
}

export function isProjectUsingNpm(cwd: string) {
  return findUp.exists(`${cwd}/package-lock.json`);
}

export function getBuildDir(rootDir: string) {
  return `${rootDir}/build/brownfield`;
}

type SpawnCommandArgs = {
  command: string;
  args: (string | number | boolean)[];
  taskDescription: string;
  cwd: string;
  customOnDataCallback?: (data: string) => void;
  customOnCloseCallback?: (errorCode: string) => void;
};

export function spawnCommand({
  command,
  args,
  taskDescription,
  cwd,
  customOnDataCallback,
  customOnCloseCallback,
}: SpawnCommandArgs) {
  return new Promise((resolve, reject) => {
    logger.info(
      `Started: ${taskDescription} ${chalk.dim(
        `(using "${command}${args.length > 0 ? ' ' : ''}${args.join(' ')}")`,
      )}`,
    );

    const [mainCommand, ...options] = command.split(' ');
    const buildProcess = spawn(
      mainCommand,
      [...options, ...args.map((e) => String(e))],
      {
        cwd,
      },
    );

    let stderr = '';

    buildProcess.stdout.on('data', (data) => {
      const stringData = data.toString();

      if (customOnDataCallback) {
        customOnDataCallback(data);
      } else if (logger.isVerbose()) {
        logger.debug(stringData);
      } else {
        process.stdout.write('.');
      }
    });

    buildProcess.stderr.on('data', (data) => {
      stderr += data;
    });

    buildProcess.on('close', (code: number) => {
      if (customOnCloseCallback) {
        customOnCloseCallback(String(code));
      } else {
        process.stdout.write('\n');
      }

      if (code !== 0) {
        reject(
          new CLIError(
            `
            Failed: ${taskDescription}.
            We ran "${command}" command but it exited with error code ${code}.
          `,
            stderr,
          ),
        );
      } else {
        resolve(`Done: ${taskDescription}`);
      }
    });
  }).catch((cliError) => {
    logger.error(cliError);
    console.error('Details:', cliError.stack);
    process.exit(-1);
  });
}
