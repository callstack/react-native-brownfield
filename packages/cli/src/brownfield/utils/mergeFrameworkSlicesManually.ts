import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function getArchitectures(binaryPath: string): string[] {
  return execSync(`xcrun lipo -archs "${binaryPath}"`, {
    encoding: 'utf8',
  })
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function orderedArchitectures(architectures: string[]): string[] {
  const order = ['arm64', 'x86_64'];
  return [...architectures].sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right);
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    return leftIndex - rightIndex;
  });
}

function writeXcframeworkInfoPlist(
  xcframeworkPath: string,
  frameworkName: string,
  slices: Array<{
    architectures: string[];
    identifier: string;
    platformVariant?: 'simulator';
  }>
): void {
  const sliceEntries = slices
    .map(({ architectures, identifier, platformVariant }) => {
      const variantBlock = platformVariant
        ? `
      <key>SupportedPlatformVariant</key>
      <string>${platformVariant}</string>`
        : '';

      return `    <dict>
      <key>BinaryPath</key>
      <string>${frameworkName}.framework/${frameworkName}</string>
      <key>LibraryIdentifier</key>
      <string>${identifier}</string>
      <key>LibraryPath</key>
      <string>${frameworkName}.framework</string>
      <key>SupportedArchitectures</key>
      <array>
${architectures.map((architecture) => `        <string>${architecture}</string>`).join('\n')}
      </array>
      <key>SupportedPlatform</key>
      <string>ios</string>${variantBlock}
    </dict>`;
    })
    .join('\n');

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>AvailableLibraries</key>
  <array>
${sliceEntries}
  </array>
  <key>CFBundlePackageType</key>
  <string>XFWK</string>
  <key>XCFrameworkFormatVersion</key>
  <string>1.0</string>
</dict>
</plist>
`;

  fs.writeFileSync(path.join(xcframeworkPath, 'Info.plist'), plist);
}

export function mergeFrameworkSlicesManually({
  deviceFrameworkPath,
  frameworkName,
  outputPath,
  simulatorFrameworkPath,
}: {
  deviceFrameworkPath: string;
  frameworkName: string;
  outputPath: string;
  simulatorFrameworkPath: string;
}): void {
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { recursive: true, force: true });
  }

  fs.mkdirSync(outputPath, { recursive: true });

  const deviceArchitectures = orderedArchitectures(
    getArchitectures(path.join(deviceFrameworkPath, frameworkName))
  );
  const simulatorArchitectures = orderedArchitectures(
    getArchitectures(path.join(simulatorFrameworkPath, frameworkName))
  );

  const deviceSliceId = `ios-${deviceArchitectures.join('_')}`;
  const simulatorSliceId = `ios-${simulatorArchitectures.join('_')}-simulator`;

  const copyFramework = (sourcePath: string, sliceId: string) => {
    const targetPath = path.join(outputPath, sliceId, `${frameworkName}.framework`);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });

    const codeSignaturePath = path.join(targetPath, '_CodeSignature');
    if (fs.existsSync(codeSignaturePath)) {
      fs.rmSync(codeSignaturePath, { recursive: true, force: true });
    }
  };

  copyFramework(deviceFrameworkPath, deviceSliceId);
  copyFramework(simulatorFrameworkPath, simulatorSliceId);

  writeXcframeworkInfoPlist(outputPath, frameworkName, [
    {
      architectures: simulatorArchitectures,
      identifier: simulatorSliceId,
      platformVariant: 'simulator',
    },
    {
      architectures: deviceArchitectures,
      identifier: deviceSliceId,
    },
  ]);
}
