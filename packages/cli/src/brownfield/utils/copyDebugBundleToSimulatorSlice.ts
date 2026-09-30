import fs from 'node:fs';
import path from 'node:path';

import { colorLink, logger, relativeToCwd } from '@rock-js/tools';

import { ALL_APPLE_SDKS, type AppleSdk } from './destinationSdks.js';

interface CopyDebugBundleToSimulatorSliceOptions {
  productsPath: string;
  configuration: string;
  frameworkName: string;
  /** Slices the build produced; defaults to both. */
  sdks?: AppleSdk[];
}

export function copyDebugBundleToSimulatorSlice({
  productsPath,
  configuration,
  frameworkName,
  sdks = ALL_APPLE_SDKS,
}: CopyDebugBundleToSimulatorSliceOptions) {
  if (!configuration.includes('Debug')) {
    return;
  }

  // nothing to copy across when only one slice was built
  if (!sdks.includes('iphoneos') || !sdks.includes('iphonesimulator')) {
    return;
  }

  const deviceBundlePath = path.join(
    productsPath,
    `${configuration}-iphoneos`,
    `${frameworkName}.framework`,
    'main.jsbundle'
  );

  const simulatorFrameworkPath = path.join(
    productsPath,
    `${configuration}-iphonesimulator`,
    `${frameworkName}.framework`
  );

  const simulatorBundlePath = path.join(
    simulatorFrameworkPath,
    'main.jsbundle'
  );

  if (!fs.existsSync(deviceBundlePath)) {
    logger.warn(
      `Skipping simulator JS bundle copy: missing ${relativeToCwd(deviceBundlePath)}`
    );
    return;
  }

  if (!fs.existsSync(simulatorFrameworkPath)) {
    logger.warn(
      `Skipping simulator JS bundle copy: missing ${relativeToCwd(simulatorFrameworkPath)}`
    );
    return;
  }

  fs.copyFileSync(deviceBundlePath, simulatorBundlePath);

  logger.success(
    `Copied Debug JS bundle to simulator slice at ${colorLink(relativeToCwd(simulatorBundlePath))}`
  );
}
