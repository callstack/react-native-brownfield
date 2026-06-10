import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';

function writeFrameworkInfoPlist(
  frameworkPath: string,
  frameworkName: string
): void {
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>${frameworkName}</string>
  <key>CFBundleIdentifier</key>
  <string>com.callstack.${frameworkName}</string>
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

  fs.writeFileSync(path.join(frameworkPath, 'Info.plist'), plist);
}

function createDynamicLibrary(
  frameworkName: string,
  target: string,
  outputPath: string
): void {
  const sdk = target.includes('simulator') ? 'iphonesimulator' : 'iphoneos';
  const sdkPath = execSync(`xcrun --sdk ${sdk} --show-sdk-path`, {
    encoding: 'utf8',
  }).trim();
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `${frameworkName.toLowerCase()}-stub-`)
  );
  const tempObj = path.join(tempDir, 'empty.o');

  try {
    execSync(
      `echo "" | xcrun clang -x c -c - -o "${tempObj}" -target ${target}`,
      { stdio: 'pipe' }
    );
    execSync(
      `xcrun clang -dynamiclib "${tempObj}" -target ${target} -isysroot "${sdkPath}" -install_name "@rpath/${frameworkName}.framework/${frameworkName}" -o "${outputPath}"`,
      { stdio: 'pipe' }
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function createFrameworkBinary(
  frameworkName: string,
  architectures: string[],
  isSimulator: boolean,
  outputPath: string
): void {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `${frameworkName.toLowerCase()}-fat-stub-`)
  );

  try {
    const dylibs = architectures.map((arch, index) => {
      const target = `${arch}-apple-ios15.0${isSimulator ? '-simulator' : ''}`;
      const dylibPath = path.join(tempDir, `${index}.dylib`);
      createDynamicLibrary(frameworkName, target, dylibPath);
      return dylibPath;
    });

    if (dylibs.length === 1) {
      fs.copyFileSync(dylibs[0], outputPath);
      return;
    }

    execSync(
      `xcrun lipo -create ${dylibs.map((dylib) => `"${dylib}"`).join(' ')} -output "${outputPath}"`,
      { stdio: 'pipe' }
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function copyDirectoryContents(sourceDir: string, destinationDir: string): void {
  if (!fs.existsSync(sourceDir)) {
    return;
  }

  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir)) {
    fs.cpSync(path.join(sourceDir, entry), path.join(destinationDir, entry), {
      recursive: true,
      force: true,
    });
  }
}

function writeXcframeworkInfoPlist(
  xcframeworkPath: string,
  frameworkName: string,
  sliceArchitectures: Record<string, string[]>
): void {
  const sliceEntries = Object.entries(sliceArchitectures)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([sliceName, architectures]) => {
      const platformVariant = sliceName.includes('simulator')
        ? `
      <key>SupportedPlatformVariant</key>
      <string>simulator</string>`
        : '';

      return `    <dict>
      <key>BinaryPath</key>
      <string>${frameworkName}.framework/${frameworkName}</string>
      <key>LibraryIdentifier</key>
      <string>${sliceName}</string>
      <key>LibraryPath</key>
      <string>${frameworkName}.framework</string>
      <key>SupportedArchitectures</key>
      <array>
${architectures.map((architecture) => `        <string>${architecture}</string>`).join('\n')}
      </array>
      <key>SupportedPlatform</key>
      <string>ios</string>${platformVariant}
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

export function normalizeLibraryXcframeworkToFramework({
  xcframeworkPath,
  frameworkName,
}: {
  xcframeworkPath: string;
  frameworkName: string;
}): void {
  const sliceArchitectures: Record<string, string[]> = {};
  const slices = fs.readdirSync(xcframeworkPath).filter((entry) => {
    const entryPath = path.join(xcframeworkPath, entry);
    return fs.statSync(entryPath).isDirectory() && entry.startsWith('ios-');
  });

  for (const sliceName of slices) {
    const sliceDir = path.join(xcframeworkPath, sliceName);
    const libraryPath = path.join(sliceDir, `lib${frameworkName}.a`);

    if (!fs.existsSync(libraryPath)) {
      continue;
    }

    const architectures = execSync(`xcrun lipo -archs "${libraryPath}"`, {
      encoding: 'utf8',
    })
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    sliceArchitectures[sliceName] = architectures;

    const frameworkDir = path.join(sliceDir, `${frameworkName}.framework`);
    const headersDir = path.join(sliceDir, 'Headers');
    const swiftModuleDir = path.join(sliceDir, `${frameworkName}.swiftmodule`);

    fs.rmSync(frameworkDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(frameworkDir, 'Headers'), { recursive: true });
    fs.mkdirSync(path.join(frameworkDir, 'Modules'), { recursive: true });

    createFrameworkBinary(
      frameworkName,
      architectures,
      sliceName.includes('simulator'),
      path.join(frameworkDir, frameworkName)
    );

    if (fs.existsSync(headersDir)) {
      for (const entry of fs.readdirSync(headersDir)) {
        const sourcePath = path.join(headersDir, entry);
        const destinationPath =
          entry === 'module.modulemap'
            ? path.join(frameworkDir, 'Modules', 'module.modulemap')
            : path.join(frameworkDir, 'Headers', entry);

        fs.cpSync(sourcePath, destinationPath, { recursive: true, force: true });
      }
    }

    copyDirectoryContents(
      swiftModuleDir,
      path.join(frameworkDir, 'Modules', `${frameworkName}.swiftmodule`)
    );
    writeFrameworkInfoPlist(frameworkDir, frameworkName);

    fs.rmSync(libraryPath, { force: true });
    fs.rmSync(headersDir, { recursive: true, force: true });
    fs.rmSync(swiftModuleDir, { recursive: true, force: true });
  }

  writeXcframeworkInfoPlist(xcframeworkPath, frameworkName, sliceArchitectures);
}
