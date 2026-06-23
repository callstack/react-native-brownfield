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

function getFrameworkArchitectures(frameworkPath: string) {
  const binaryPath = findFrameworkBinaryPath(frameworkPath);

  if (!binaryPath) {
    return [];
  }

  const lipoOutput = execFileSync('xcrun', ['lipo', '-info', binaryPath], {
    encoding: 'utf8',
  }).trim();

  const fatMatch = lipoOutput.match(/are:\s(.+)$/);
  if (fatMatch) {
    return fatMatch[1].split(/\s+/).filter(Boolean);
  }

  const thinMatch = lipoOutput.match(/architecture:\s(.+)$/);
  if (thinMatch) {
    return [thinMatch[1]];
  }

  return [];
}

function writeFallbackXcframework({
  frameworkName,
  outputPath,
  deviceFrameworkPath,
  simulatorFrameworkPath,
}: {
  frameworkName: string;
  outputPath: string;
  deviceFrameworkPath: string;
  simulatorFrameworkPath: string;
}) {
  fs.rmSync(outputPath, { recursive: true, force: true });
  fs.mkdirSync(outputPath, { recursive: true });
  const deviceArchitectures = getFrameworkArchitectures(deviceFrameworkPath);
  const simulatorArchitectures = getFrameworkArchitectures(simulatorFrameworkPath);

  const slices = [
    {
      frameworkPath: deviceFrameworkPath,
      libraryIdentifier: `ios-${deviceArchitectures.join('_') || 'arm64'}`,
      supportedArchitectures:
        deviceArchitectures.length > 0 ? deviceArchitectures : ['arm64'],
      supportedPlatform: 'ios',
      supportedPlatformVariant: null,
    },
    {
      frameworkPath: simulatorFrameworkPath,
      libraryIdentifier: `ios-${simulatorArchitectures.join('_') || 'arm64_x86_64'}-simulator`,
      supportedArchitectures:
        simulatorArchitectures.length > 0
          ? simulatorArchitectures
          : ['arm64', 'x86_64'],
      supportedPlatform: 'ios',
      supportedPlatformVariant: 'simulator',
    },
  ];

  const availableLibrariesXml = slices
    .map(
      ({
        libraryIdentifier,
        supportedArchitectures,
        supportedPlatform,
        supportedPlatformVariant,
      }) => `    <dict>
      <key>BinaryPath</key>
      <string>${frameworkName}.framework/${frameworkName}</string>
      <key>LibraryIdentifier</key>
      <string>${libraryIdentifier}</string>
      <key>LibraryPath</key>
      <string>${frameworkName}.framework</string>
      <key>SupportedArchitectures</key>
      <array>
${supportedArchitectures
  .map((architecture) => `        <string>${architecture}</string>`)
  .join('\n')}
      </array>
      <key>SupportedPlatform</key>
      <string>${supportedPlatform}</string>
${supportedPlatformVariant ? `      <key>SupportedPlatformVariant</key>\n      <string>${supportedPlatformVariant}</string>\n` : ''}    </dict>`
    )
    .join('\n');

  for (const { frameworkPath, libraryIdentifier } of slices) {
    fs.cpSync(
      frameworkPath,
      path.join(outputPath, libraryIdentifier, `${frameworkName}.framework`),
      { recursive: true }
    );
  }

  fs.writeFileSync(
    path.join(outputPath, 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>AvailableLibraries</key>
  <array>
${availableLibrariesXml}
  </array>
  <key>CFBundlePackageType</key>
  <string>XFWK</string>
  <key>XCFrameworkFormatVersion</key>
  <string>1.0</string>
</dict>
</plist>
`
  );
}

function collectBuiltFrameworkNames(platformProductsPath: string) {
  const frameworkNames = new Set<string>();
  const pending = [platformProductsPath];

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

      if (entry.name.endsWith('.framework') && findFrameworkBinaryPath(entryPath)) {
        frameworkNames.add(path.basename(entry.name, '.framework'));
        continue;
      }

      pending.push(entryPath);
    }
  }

  return frameworkNames;
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
  const deviceProductFrameworkNames = collectBuiltFrameworkNames(
    path.join(productsPath, `${configuration}-iphoneos`)
  );
  const simulatorProductFrameworkNames = collectBuiltFrameworkNames(
    path.join(productsPath, `${configuration}-iphonesimulator`)
  );
  const productFrameworkNamesWithBothSlices = new Set(
    [...deviceProductFrameworkNames].filter((name) =>
      simulatorProductFrameworkNames.has(name)
    )
  );

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

  for (const dependencyName of productFrameworkNamesWithBothSlices) {
    if (!alreadyPackagedFrameworkNames.has(dependencyName)) {
      additionalFrameworkNames.add(dependencyName);
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

    try {
      await mergeFrameworks({
        sourceDir,
        frameworkPaths: [deviceFrameworkPath, simulatorFrameworkPath],
        outputPath,
      });
    } catch {
      writeFallbackXcframework({
        frameworkName: dependencyName,
        outputPath,
        deviceFrameworkPath,
        simulatorFrameworkPath,
      });
      logger.warn(
        `Fell back to raw-slice XCFramework staging for ${dependencyName}`
      );
    }

    logger.success(
      `Packaged additional XCFramework at ${colorLink(relativeToCwd(outputPath))}`
    );
  }
}
