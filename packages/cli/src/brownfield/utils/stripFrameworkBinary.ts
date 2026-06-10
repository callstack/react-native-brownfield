import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { logger } from '@rock-js/tools';

interface SliceConfig {
  target: string;
  /** Additional targets for fat binaries */
  additionalTargets?: string[];
}

const SLICE_CONFIGS: Record<string, SliceConfig> = {
  'ios-arm64': {
    target: 'arm64-apple-ios15.0',
  },
  'ios-arm64_x86_64-simulator': {
    target: 'arm64-apple-ios15.0-simulator',
    additionalTargets: ['x86_64-apple-ios15.0-simulator'],
  },
};

/**
 * Creates an empty static library for the given target.
 */
function createEmptyStaticLib(target: string): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-strip-'));
  const tempObj = path.join(tempDir, 'empty.o');
  const tempLib = path.join(tempDir, 'empty.a');

  try {
    execSync(
      `echo "" | xcrun clang -x c -c - -o "${tempObj}" -target ${target}`,
      {
        stdio: 'pipe',
      }
    );

    execSync(`xcrun ar rcs "${tempLib}" "${tempObj}"`, {
      stdio: 'pipe',
    });
  } catch (error) {
    fs.rmSync(tempDir, { recursive: true });
    throw new Error(
      `Failed to create empty static library for target ${target}: ${error instanceof Error ? error.message : error}`
    );
  }

  fs.unlinkSync(tempObj);

  return tempLib;
}

/**
 * Creates a fat static library combining multiple architectures.
 */
function createFatStaticLib(targets: string[]): string {
  const libs = targets.map((target) => createEmptyStaticLib(target));

  const outputDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'framework-strip-fat-')
  );
  const outputLib = path.join(outputDir, 'fat.a');

  try {
    execSync(
      `xcrun lipo -create ${libs.map((l) => `"${l}"`).join(' ')} -output "${outputLib}"`,
      {
        stdio: 'pipe',
      }
    );
  } catch (error) {
    libs.forEach((lib) => fs.rmSync(path.dirname(lib), { recursive: true }));
    fs.rmSync(outputDir, { recursive: true });
    throw new Error(
      `Failed to create fat static library: ${error instanceof Error ? error.message : error}`
    );
  }

  libs.forEach((lib) => {
    fs.unlinkSync(lib);
    fs.rmSync(path.dirname(lib), { recursive: true });
  });

  return outputLib;
}

function sdkForTarget(target: string): 'iphoneos' | 'iphonesimulator' {
  return target.includes('simulator') ? 'iphonesimulator' : 'iphoneos';
}

function createEmptyDynamicLibrary(
  frameworkName: string,
  target: string,
  outputPath: string
): void {
  const sdk = sdkForTarget(target);
  const sdkPath = execSync(`xcrun --sdk ${sdk} --show-sdk-path`, {
    encoding: 'utf8',
  }).trim();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-strip-dylib-'));
  const tempObj = path.join(tempDir, 'empty.o');

  try {
    execSync(
      `echo "" | xcrun clang -x c -c - -o "${tempObj}" -target ${target}`,
      {
        stdio: 'pipe',
      }
    );
    execSync(
      `xcrun clang -dynamiclib "${tempObj}" -target ${target} -isysroot "${sdkPath}" -install_name "@rpath/${frameworkName}.framework/${frameworkName}" -o "${outputPath}"`,
      {
        stdio: 'pipe',
      }
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createFatDynamicLibrary(
  frameworkName: string,
  targets: string[],
  outputPath: string
): void {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'framework-strip-fat-dylib-'));
  const dylibPaths: string[] = [];

  try {
    for (const [index, target] of targets.entries()) {
      const dylibPath = path.join(tempDir, `${index}.dylib`);
      createEmptyDynamicLibrary(frameworkName, target, dylibPath);
      dylibPaths.push(dylibPath);
    }

    execSync(
      `xcrun lipo -create ${dylibPaths.map((dylib) => `"${dylib}"`).join(' ')} -output "${outputPath}"`,
      {
        stdio: 'pipe',
      }
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

/**
 * Strips the binary from an xcframework, keeping only Swift module interfaces.
 * This creates an "interface-only" framework where consumers can import the module
 * but the actual symbols must come from another framework (e.g., BrownfieldLib).
 *
 * @param xcframeworkPath - Path to the .xcframework directory
 */
export function stripFrameworkBinary(xcframeworkPath: string): void {
  if (!fs.existsSync(xcframeworkPath)) {
    throw new Error(`XCFramework not found at: ${xcframeworkPath}`);
  }

  const frameworkName = path.basename(xcframeworkPath, '.xcframework');

  logger.info(
    `Stripping binary from ${frameworkName}.xcframework (interface-only)...`
  );

  const slices = fs.readdirSync(xcframeworkPath).filter((entry) => {
    const fullPath = path.join(xcframeworkPath, entry);
    return fs.statSync(fullPath).isDirectory() && entry.startsWith('ios-');
  });

  for (const sliceName of slices) {
    const frameworkDir = path.join(
      xcframeworkPath,
      sliceName,
      `${frameworkName}.framework`
    );
    const isFrameworkSlice = fs.existsSync(frameworkDir);
    const binaryPath = isFrameworkSlice
      ? path.join(frameworkDir, frameworkName)
      : path.join(xcframeworkPath, sliceName, `lib${frameworkName}.a`);

    if (!fs.existsSync(binaryPath)) {
      logger.warn(`No binary found at ${binaryPath}, skipping`);
      continue;
    }

    const config = SLICE_CONFIGS[sliceName];
    if (!config) {
      logger.warn(`Unknown slice type: ${sliceName}, skipping`);
      continue;
    }

    const targets = config.additionalTargets
      ? [config.target, ...config.additionalTargets]
      : [config.target];

    if (isFrameworkSlice) {
      if (targets.length > 1) {
        createFatDynamicLibrary(frameworkName, targets, binaryPath);
      } else {
        createEmptyDynamicLibrary(frameworkName, targets[0], binaryPath);
      }
    } else {
      let emptyLib: string;
      if (targets.length > 1) {
        emptyLib = createFatStaticLib(targets);
      } else {
        emptyLib = createEmptyStaticLib(targets[0]);
      }

      fs.copyFileSync(emptyLib, binaryPath);
      fs.unlinkSync(emptyLib);
      fs.rmSync(path.dirname(emptyLib), { recursive: true });
    }
  }

  logger.success(`${frameworkName}.xcframework is now interface-only`);
}
