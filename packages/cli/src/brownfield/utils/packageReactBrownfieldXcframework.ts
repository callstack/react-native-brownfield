import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

import { mergeFrameworks } from '@rock-js/platform-apple-helpers';
import { logger } from '@rock-js/tools';

const require = createRequire(import.meta.url);

function normalizeIosSourceDir(projectRoot: string, sourceDir: string) {
  if (path.isAbsolute(sourceDir)) {
    return sourceDir;
  }

  return path.join(projectRoot, sourceDir.trim().length > 0 ? sourceDir : 'ios');
}

function resolvePackageRoot(projectRoot: string, packageName: string) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`, {
    paths: [projectRoot],
  });

  return path.dirname(packageJsonPath);
}

function createFrameworkInfoPlist({
  bundleIdentifier,
  frameworkName,
}: {
  bundleIdentifier: string;
  frameworkName: string;
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>${frameworkName}</string>
  <key>CFBundleIdentifier</key>
  <string>${bundleIdentifier}</string>
  <key>CFBundleName</key>
  <string>${frameworkName}</string>
  <key>CFBundlePackageType</key>
  <string>FMWK</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
</dict>
</plist>
`;
}

function createFrameworkModuleMap(frameworkName: string) {
  return `framework module ${frameworkName} {
  umbrella header "../Headers/${frameworkName}-umbrella.h"

  export *
  module * { export * }
}

module ${frameworkName}.Swift {
  header "../Headers/${frameworkName}-Swift.h"
  requires objc
}
`;
}

function ensureDirectory(targetPath: string) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyFile(sourcePath: string, destinationPath: string) {
  ensureDirectory(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

function copyDirectory(sourcePath: string, destinationPath: string) {
  ensureDirectory(path.dirname(destinationPath));
  fs.cpSync(sourcePath, destinationPath, { recursive: true, force: true });
}

function createFrameworkWrapper({
  buildProductPath,
  bundleIdentifier,
  frameworkName,
  publicHeaderPaths,
}: {
  buildProductPath: string;
  bundleIdentifier: string;
  frameworkName: string;
  publicHeaderPaths: string[];
}) {
  const frameworkTempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `${frameworkName.toLowerCase()}-framework-`)
  );
  const frameworkDir = path.join(frameworkTempDir, `${frameworkName}.framework`);
  const headersDir = path.join(frameworkDir, 'Headers');
  const modulesDir = path.join(frameworkDir, 'Modules');
  const swiftModuleSourceDir = path.join(buildProductPath, `${frameworkName}.swiftmodule`);

  ensureDirectory(headersDir);
  ensureDirectory(modulesDir);

  copyFile(
    path.join(buildProductPath, `lib${frameworkName}.a`),
    path.join(frameworkDir, frameworkName)
  );
  copyFile(
    path.join(buildProductPath, `${frameworkName}-umbrella.h`),
    path.join(headersDir, `${frameworkName}-umbrella.h`)
  );
  copyFile(
    path.join(buildProductPath, `${frameworkName}.modulemap`),
    path.join(headersDir, `${frameworkName}.modulemap`)
  );
  copyFile(
    path.join(buildProductPath, 'Swift Compatibility Header', `${frameworkName}-Swift.h`),
    path.join(headersDir, `${frameworkName}-Swift.h`)
  );
  copyDirectory(
    swiftModuleSourceDir,
    path.join(modulesDir, `${frameworkName}.swiftmodule`)
  );
  for (const headerPath of publicHeaderPaths) {
    copyFile(headerPath, path.join(headersDir, path.basename(headerPath)));
  }

  fs.writeFileSync(
    path.join(modulesDir, 'module.modulemap'),
    createFrameworkModuleMap(frameworkName),
    'utf8'
  );
  fs.writeFileSync(
    path.join(frameworkDir, 'Info.plist'),
    createFrameworkInfoPlist({ bundleIdentifier, frameworkName }),
    'utf8'
  );

  return frameworkDir;
}

function resolveFrameworkInputPath({
  buildProductPath,
  bundleIdentifier,
  frameworkName,
  publicHeaderPaths,
}: {
  buildProductPath: string;
  bundleIdentifier: string;
  frameworkName: string;
  publicHeaderPaths: string[];
}) {
  const nativeFrameworkPath = path.join(
    buildProductPath,
    `${frameworkName}.framework`
  );

  if (fs.existsSync(nativeFrameworkPath)) {
    return nativeFrameworkPath;
  }

  return createFrameworkWrapper({
    buildProductPath,
    bundleIdentifier,
    frameworkName,
    publicHeaderPaths,
  });
}

export async function packageSupportModuleXcframework({
  bundleIdentifier,
  configuration,
  moduleName,
  npmPackageName,
  packageDir,
  publicHeaders,
  productsPath,
  projectRoot,
  sourceDir,
}: {
  bundleIdentifier: string;
  configuration: string;
  moduleName: string;
  npmPackageName: string;
  packageDir: string;
  publicHeaders: string[];
  productsPath: string;
  projectRoot: string;
  sourceDir: string;
}) {
  const iosSourceDir = normalizeIosSourceDir(projectRoot, sourceDir);
  const publicHeadersDir = path.join(
    resolvePackageRoot(projectRoot, npmPackageName),
    'ios'
  );
  const publicHeaderPaths = publicHeaders.map((header) =>
    path.join(publicHeadersDir, header)
  );

  const deviceFrameworkPath = resolveFrameworkInputPath({
    buildProductPath: path.join(productsPath, `${configuration}-iphoneos`, moduleName),
    bundleIdentifier,
    frameworkName: moduleName,
    publicHeaderPaths,
  });
  const simulatorFrameworkPath = resolveFrameworkInputPath({
    buildProductPath: path.join(
      productsPath,
      `${configuration}-iphonesimulator`,
      moduleName
    ),
    bundleIdentifier,
    frameworkName: moduleName,
    publicHeaderPaths,
  });

  await mergeFrameworks({
    sourceDir: iosSourceDir,
    frameworkPaths: [deviceFrameworkPath, simulatorFrameworkPath],
    outputPath: path.join(packageDir, `${moduleName}.xcframework`),
  });

  logger.success(`Packaged ${moduleName}.xcframework`);
}
