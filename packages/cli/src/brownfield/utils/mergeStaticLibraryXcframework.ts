import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { RockError, color, logger } from '@rock-js/tools';

function createHeaderStagingDir(
  moduleOutputDir: string,
  frameworkName: string
): string {
  const stagingDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `${frameworkName.toLowerCase()}-headers-`)
  );

  const candidates = [
    {
      source: path.join(moduleOutputDir, `${frameworkName}-umbrella.h`),
      target: path.join(stagingDir, `${frameworkName}-umbrella.h`),
    },
    {
      source: path.join(
        moduleOutputDir,
        'Swift Compatibility Header',
        `${frameworkName}-Swift.h`
      ),
      target: path.join(stagingDir, `${frameworkName}-Swift.h`),
    },
    {
      source: path.join(moduleOutputDir, `${frameworkName}.modulemap`),
      target: path.join(stagingDir, 'module.modulemap'),
    },
  ];

  for (const { source, target } of candidates) {
    if (!fs.existsSync(source)) {
      continue;
    }

    fs.copyFileSync(source, target);
  }

  return stagingDir;
}

function copySwiftModuleArtifacts(
  moduleOutputDir: string,
  xcframeworkSliceDir: string,
  frameworkName: string
): void {
  const swiftModuleSourceDir = path.join(
    moduleOutputDir,
    `${frameworkName}.swiftmodule`
  );

  if (!fs.existsSync(swiftModuleSourceDir)) {
    return;
  }

  const swiftModuleTargetDir = path.join(
    xcframeworkSliceDir,
    `${frameworkName}.swiftmodule`
  );

  fs.mkdirSync(swiftModuleTargetDir, { recursive: true });

  for (const entry of fs.readdirSync(swiftModuleSourceDir)) {
    const sourcePath = path.join(swiftModuleSourceDir, entry);
    const targetPath = path.join(swiftModuleTargetDir, entry);

    fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
  }
}

export function mergeStaticLibraryXcframework({
  sourceDir,
  outputPath,
  frameworkName,
  deviceModuleOutputDir,
  simulatorModuleOutputDir,
}: {
  sourceDir: string;
  outputPath: string;
  frameworkName: string;
  deviceModuleOutputDir: string;
  simulatorModuleOutputDir: string;
}): void {
  const deviceLibraryPath = path.join(
    deviceModuleOutputDir,
    `lib${frameworkName}.a`
  );
  const simulatorLibraryPath = path.join(
    simulatorModuleOutputDir,
    `lib${frameworkName}.a`
  );

  if (!fs.existsSync(deviceLibraryPath) || !fs.existsSync(simulatorLibraryPath)) {
    throw new RockError(
      `Missing static library output for ${frameworkName}: ${deviceLibraryPath} or ${simulatorLibraryPath}`
    );
  }

  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { recursive: true, force: true });
  }

  const deviceHeadersDir = createHeaderStagingDir(
    deviceModuleOutputDir,
    frameworkName
  );
  const simulatorHeadersDir = createHeaderStagingDir(
    simulatorModuleOutputDir,
    frameworkName
  );

  logger.info(`Merging ${color.bold(`${frameworkName}.xcframework`)}...`);

  try {
    execFileSync(
      'xcodebuild',
      [
        '-create-xcframework',
        '-library',
        deviceLibraryPath,
        '-headers',
        deviceHeadersDir,
        '-library',
        simulatorLibraryPath,
        '-headers',
        simulatorHeadersDir,
        '-output',
        outputPath,
      ],
      {
        cwd: sourceDir,
        stdio: 'pipe',
      }
    );
  } catch (error) {
    const stderr =
      error instanceof Error && 'stderr' in error
        ? String((error as { stderr?: Buffer | string }).stderr ?? '')
        : String(error);

    throw new RockError(`Failed to merge ${frameworkName}.xcframework`, {
      cause: stderr,
    });
  } finally {
    fs.rmSync(deviceHeadersDir, { recursive: true, force: true });
    fs.rmSync(simulatorHeadersDir, { recursive: true, force: true });
  }

  copySwiftModuleArtifacts(
    deviceModuleOutputDir,
    path.join(outputPath, 'ios-arm64'),
    frameworkName
  );
  copySwiftModuleArtifacts(
    simulatorModuleOutputDir,
    path.join(outputPath, 'ios-arm64_x86_64-simulator'),
    frameworkName
  );
}
