import fs from 'node:fs';
import path from 'node:path';

type Resolution = 'explicit' | 'detected' | 'not_found' | 'ambiguous';

export interface ResolvePackagedFrameworkNameResult {
  frameworkName: string | null;
  resolution: Resolution;
  candidates?: string[];
}

interface ResolvePackagedFrameworkNameOptions {
  explicitScheme?: string;
  productsPath: string;
  configuration: string;
}

function collectFrameworkCandidates(configurationProductsPath: string): string[] {
  if (!fs.existsSync(configurationProductsPath)) {
    return [];
  }

  const discoveredFrameworks = new Set<string>();

  for (const entry of fs.readdirSync(configurationProductsPath, { withFileTypes: true })) {
    const entryPath = path.join(configurationProductsPath, entry.name);

    if (entry.isDirectory() && entry.name.endsWith('.framework')) {
      const frameworkName = path.basename(entry.name, '.framework');
      const bundlePath = path.join(entryPath, 'main.jsbundle');

      if (fs.existsSync(bundlePath)) {
        discoveredFrameworks.add(frameworkName);
      }

      continue;
    }

    if (!entry.isDirectory()) {
      continue;
    }

    for (const nestedEntry of fs.readdirSync(entryPath, { withFileTypes: true })) {
      if (!nestedEntry.isDirectory() || !nestedEntry.name.endsWith('.framework')) {
        continue;
      }

      const frameworkName = path.basename(nestedEntry.name, '.framework');
      const bundlePath = path.join(entryPath, nestedEntry.name, 'main.jsbundle');

      if (fs.existsSync(bundlePath)) {
        discoveredFrameworks.add(frameworkName);
      }
    }
  }

  return [...discoveredFrameworks].sort();
}

export function resolvePackagedFrameworkName({
  explicitScheme,
  productsPath,
  configuration,
}: ResolvePackagedFrameworkNameOptions): ResolvePackagedFrameworkNameResult {
  if (explicitScheme) {
    return {
      frameworkName: explicitScheme,
      resolution: 'explicit',
    };
  }

  const configurationProductsPath = path.join(
    productsPath,
    `${configuration}-iphoneos`
  );
  const candidates = collectFrameworkCandidates(configurationProductsPath);

  if (candidates.length === 1) {
    return {
      frameworkName: candidates[0] ?? null,
      resolution: 'detected',
    };
  }

  if (candidates.length === 0) {
    return {
      frameworkName: null,
      resolution: 'not_found',
      candidates,
    };
  }

  return {
    frameworkName: null,
    resolution: 'ambiguous',
    candidates,
  };
}
