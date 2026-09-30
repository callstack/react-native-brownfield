import fs from 'node:fs';
import path from 'node:path';

/** Xcode SDK a build product directory belongs to (`Release-iphoneos`, `Release-iphonesimulator`). */
export type AppleSdk = 'iphoneos' | 'iphonesimulator';

/** Both slices, in the order Rock's `packageIosAction` builds them. */
export const ALL_APPLE_SDKS: AppleSdk[] = ['iphoneos', 'iphonesimulator'];

/**
 * Map a single `--destination` value onto the SDK(s) its build products land in.
 *
 * Mirrors `resolveDestination` in `@rock-js/platform-apple-helpers`: the aliases
 * `device`/`simulator` plus any raw `xcodebuild -destination` string. A value we
 * cannot classify (`id=<udid>`, `name=iPhone 17`) may resolve to either SDK, so it
 * widens to both rather than silently dropping a slice.
 */
function resolveSdksForDestination(destination: string): AppleSdk[] {
  const normalized = destination.trim().toLowerCase();

  if (normalized === 'device') {
    return ['iphoneos'];
  }

  if (normalized === 'simulator' || normalized.includes('simulator')) {
    return ['iphonesimulator'];
  }

  if (normalized.includes('platform=ios')) {
    return ['iphoneos'];
  }

  return ALL_APPLE_SDKS;
}

/**
 * SDK slices a `package:ios` run produces for the given `--destination` values.
 *
 * Omitting `--destination` builds both slices, matching Rock's default.
 */
export function resolveDestinationSdks(
  destination?: string[] | null
): AppleSdk[] {
  if (!destination || destination.length === 0) {
    return ALL_APPLE_SDKS;
  }

  const sdks = new Set(destination.flatMap(resolveSdksForDestination));

  // keep a stable order regardless of the order the flags were passed in
  return ALL_APPLE_SDKS.filter((sdk) => sdks.has(sdk));
}

/**
 * Whether `directoryPath` holds a build product `mergeFrameworks` can consume:
 * either a real `.framework` bundle or the static library it synthesizes one from.
 */
export function hasFrameworkBuildProduct(
  directoryPath: string,
  frameworkName: string
) {
  return (
    fs.existsSync(path.join(directoryPath, `${frameworkName}.framework`)) ||
    fs.existsSync(path.join(directoryPath, `lib${frameworkName}.a`))
  );
}

interface CollectFrameworkPathsOptions {
  productsPath: string;
  configuration: string;
  sdks: AppleSdk[];
  frameworkName: string;
  /** Sub-directory of the configuration products dir, e.g. `Brownie` for a Pod target. */
  productSubDir?: string;
}

/**
 * `.framework` paths to merge into an XCFramework, limited to the slices that were
 * actually built. Slices with no build product on disk are dropped, so a
 * `--destination simulator` run merges the simulator slice alone instead of failing
 * on a missing `-iphoneos` directory.
 */
export function collectFrameworkPaths({
  productsPath,
  configuration,
  sdks,
  frameworkName,
  productSubDir,
}: CollectFrameworkPathsOptions): string[] {
  return sdks
    .map((sdk) =>
      path.join(
        productsPath,
        `${configuration}-${sdk}`,
        ...(productSubDir ? [productSubDir] : [])
      )
    )
    .filter((directoryPath) =>
      hasFrameworkBuildProduct(directoryPath, frameworkName)
    )
    .map((directoryPath) =>
      path.join(directoryPath, `${frameworkName}.framework`)
    );
}
