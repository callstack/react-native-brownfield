import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { mergeFrameworks } from '@rock-js/platform-apple-helpers';
import { colorLink, logger, relativeToCwd } from '@rock-js/tools';

type Platform = 'iphoneos' | 'iphonesimulator';

interface PackageTransitiveDynamicFrameworksOptions {
  configuration: string;
  frameworkName: string;
  packageDir: string;
  productsPath: string;
  sourceDir: string;
}

function findFrameworkBinaryPath(frameworkPath: string) {
  const binaryName = path.basename(frameworkPath, '.framework');
  const binaryPath = path.join(frameworkPath, binaryName);

  return fs.existsSync(binaryPath) ? binaryPath : null;
}

function parseRpathFrameworkDependencies(binaryPath: string) {
  const output = execFileSync('otool', ['-L', binaryPath], {
    encoding: 'utf8',
  });

  return output
    .split('\n')
    .map((line) => line.trim())
    .map((line) =>
      line.match(/^@rpath\/([^/]+)\.framework\/[^/\s]+(?:\s|\()/)?.[1] ?? null
    )
    .filter((frameworkName): frameworkName is string => frameworkName !== null);
}

function findFrameworkPath(platformProductsPath: string, frameworkName: string) {
  const pending = [platformProductsPath];
  const expectedEntryName = `${frameworkName}.framework`;

  while (pending.length > 0) {
    const currentPath = pending.pop();

    if (!currentPath || !fs.existsSync(currentPath)) {
      continue;
    }

    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const entryPath = path.join(currentPath, entry.name);

      if (entry.name === expectedEntryName && findFrameworkBinaryPath(entryPath)) {
        return entryPath;
      }

      pending.push(entryPath);
    }
  }

  return null;
}

export async function packageTransitiveDynamicFrameworks({
  configuration,
  frameworkName,
  packageDir,
  productsPath,
  sourceDir,
}: PackageTransitiveDynamicFrameworksOptions) {
  const alreadyPackagedFrameworkNames = new Set(
    fs
      .readdirSync(packageDir, { withFileTypes: true })
      .filter(
        (entry) => entry.isDirectory() && entry.name.endsWith('.xcframework')
      )
      .map((entry) => path.basename(entry.name, '.xcframework'))
  );
  const visitedFrameworkNames = new Set<string>();
  const frameworkNameQueue = [frameworkName];
  const additionalFrameworkNames = new Set<string>();
  const resolvedFrameworkPaths = new Map<string, string>();

  const resolveFrameworkPath = (platform: Platform, name: string) => {
    const cacheKey = `${platform}:${name}`;
    const cachedPath = resolvedFrameworkPaths.get(cacheKey);

    if (cachedPath !== undefined) {
      return cachedPath;
    }

    const resolvedPath = findFrameworkPath(
      path.join(productsPath, `${configuration}-${platform}`),
      name
    );

    resolvedFrameworkPaths.set(cacheKey, resolvedPath ?? '');

    return resolvedPath;
  };

  while (frameworkNameQueue.length > 0) {
    const currentFrameworkName = frameworkNameQueue.shift();

    if (!currentFrameworkName || visitedFrameworkNames.has(currentFrameworkName)) {
      continue;
    }

    visitedFrameworkNames.add(currentFrameworkName);

    const binaryPath = findFrameworkBinaryPath(
      resolveFrameworkPath('iphonesimulator', currentFrameworkName) ??
        resolveFrameworkPath('iphoneos', currentFrameworkName) ??
        ''
    );

    if (!binaryPath) {
      continue;
    }

    for (const dependencyName of parseRpathFrameworkDependencies(binaryPath)) {
      if (!visitedFrameworkNames.has(dependencyName)) {
        frameworkNameQueue.push(dependencyName);
      }

      if (!alreadyPackagedFrameworkNames.has(dependencyName)) {
        additionalFrameworkNames.add(dependencyName);
      }
    }
  }

  for (const dependencyName of [...additionalFrameworkNames].sort()) {
    const deviceFrameworkPath = resolveFrameworkPath('iphoneos', dependencyName);
    const simulatorFrameworkPath = resolveFrameworkPath(
      'iphonesimulator',
      dependencyName
    );

    if (!deviceFrameworkPath || !simulatorFrameworkPath) {
      logger.warn(
        `Skipping transitive framework packaging for ${dependencyName}: could not resolve both platform slices`
      );
      continue;
    }

    const outputPath = path.join(packageDir, `${dependencyName}.xcframework`);

    await mergeFrameworks({
      sourceDir,
      frameworkPaths: [deviceFrameworkPath, simulatorFrameworkPath],
      outputPath,
    });

    logger.success(
      `Packaged transitive XCFramework at ${colorLink(relativeToCwd(outputPath))}`
    );
  }
}
