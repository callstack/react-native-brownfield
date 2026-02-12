import { spawn } from 'node:child_process';

import { logger } from '@rock-js/tools';

import { isExpoProject } from './project.js';

type ExpoPlatform = 'ios' | 'android';

async function spawnCommand({
  command,
  args,
  cwd,
}: {
  command: string;
  args: string[];
  cwd: string;
}) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Command "${command} ${args.join(' ')}" failed with exit code ${code ?? 'unknown'}.`
          )
        );
      }
    });
  });
}

function getNpxCommand() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

export async function runExpoPrebuildIfNeeded({
  projectRoot,
  platform,
}: {
  projectRoot: string;
  platform: ExpoPlatform;
}) {
  if (!isExpoProject(projectRoot)) {
    return false;
  }

  logger.info(`Expo project detected. Running expo prebuild for ${platform}...`);

  const args = ['expo', 'prebuild', '--platform', platform];
  if (platform === 'ios') {
    args.push('--no-install');
  }

  await spawnCommand({
    command: getNpxCommand(),
    args,
    cwd: projectRoot,
  });

  return true;
}
