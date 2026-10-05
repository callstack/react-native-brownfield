import * as fs from 'node:fs';
import * as path from 'node:path';

import { Logger } from '../expo-config-plugin/logging';

export const BROWNFIELD_RUNTIME_PACKAGE_NAME =
  '@callstack/react-native-brownfield';
export const BROWNFIELD_CLI_PACKAGE_NAME = '@callstack/brownfield-cli';

/**
 * Match the docs convention (getting-started/quick-start + expo.mdx): both
 * packages are regular dependencies. The brownfield CLI ships as a dependency
 * of the runtime package, so a consistent caret range pinned to this package's
 * own published version keeps the two in lockstep (they are released together).
 */
export function resolveBrownfieldPackageVersionRange(): string {
  return `^${readOwnPackageVersion()}`;
}

function readOwnPackageVersion(): string {
  // Walk up from this module to its own package.json. Works both in the
  // published layout (lib/commonjs/scaffold -> package root) and in-repo
  // (src/scaffold -> package root). `__dirname` is absent in true-ESM builds
  // (and `import.meta` must not be used here — Babel keeps it verbatim in the
  // CJS output, which is a parse SyntaxError there; see index.ts), so fall
  // back to cwd, which is correct whenever the package is resolved from the
  // app's own node_modules chain.
  let dir = typeof __dirname === 'string' ? __dirname : process.cwd();
  while (true) {
    const packageJsonPath = path.join(dir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
        name?: string;
        version?: string;
      };
      if (pkg.name === BROWNFIELD_RUNTIME_PACKAGE_NAME) {
        if (!pkg.version) {
          throw new Error(
            `${BROWNFIELD_RUNTIME_PACKAGE_NAME} package.json has no version`
          );
        }
        return pkg.version;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    `Could not locate the ${BROWNFIELD_RUNTIME_PACKAGE_NAME} package.json to resolve dependency versions.`
  );
}

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  [key: string]: unknown;
};

function readPackageJson(projectRoot: string): PackageJson {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Missing ${packageJsonPath}`);
  }
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as PackageJson;
}

function writePackageJson(projectRoot: string, pkg: PackageJson): void {
  // Stable formatting (2-space indent, trailing newline), so repeated runs
  // produce byte-identical output.
  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(pkg, null, 2) + '\n',
    'utf8'
  );
}

function ensureDependency(
  pkg: PackageJson,
  packageName: string,
  versionRange: string
): boolean {
  // Idempotency: if the package is declared anywhere already, leave the
  // user's version spec untouched (same spirit as the Podfile/gradle guards).
  if (pkg.dependencies?.[packageName] ?? pkg.devDependencies?.[packageName]) {
    return false;
  }
  pkg.dependencies = pkg.dependencies ?? {};
  pkg.dependencies[packageName] = versionRange;
  return true;
}

/**
 * Adds @callstack/react-native-brownfield (the Kotlin/Swift host code the
 * scaffolded module imports) and @callstack/brownfield-cli (the `brownfield`
 * bin used by the package:* scripts) to the app's dependencies.
 * Existing declarations are never overwritten. Returns the names added.
 */
export function addBrownfieldDependencies(projectRoot: string): string[] {
  const pkg = readPackageJson(projectRoot);
  const versionRange = resolveBrownfieldPackageVersionRange();

  const added: string[] = [];
  if (ensureDependency(pkg, BROWNFIELD_RUNTIME_PACKAGE_NAME, versionRange)) {
    added.push(BROWNFIELD_RUNTIME_PACKAGE_NAME);
  }
  if (ensureDependency(pkg, BROWNFIELD_CLI_PACKAGE_NAME, versionRange)) {
    added.push(BROWNFIELD_CLI_PACKAGE_NAME);
  }

  if (added.length > 0) {
    writePackageJson(projectRoot, pkg);
    Logger.logDebug(
      `Added Brownfield dependencies: ${added.join(', ')} (${versionRange})`
    );
  }
  return added;
}

/**
 * Adds the `package:ios` / `package:android` scripts from the docs' manual
 * steps (settings come from the generated brownfield.config.json, so no flags
 * are duplicated here). Existing scripts with the same names are kept.
 */
export function addBrownfieldPackageScripts(projectRoot: string): string[] {
  const pkg = readPackageJson(projectRoot);
  pkg.scripts = pkg.scripts ?? {};

  const desiredScripts: Record<string, string> = {
    'package:ios': 'brownfield package:ios',
    'package:android': 'brownfield package:android',
  };

  const added: string[] = [];
  for (const [name, command] of Object.entries(desiredScripts)) {
    if (pkg.scripts[name] === undefined) {
      pkg.scripts[name] = command;
      added.push(name);
    }
  }

  if (added.length > 0) {
    writePackageJson(projectRoot, pkg);
    Logger.logDebug(`Added Brownfield scripts: ${added.join(', ')}`);
  }
  return added;
}

export type BrownfieldFileConfig = {
  $schema: string;
  ios: {
    scheme: string;
    configuration: string;
  };
  android: {
    moduleName: string;
    variant: string;
  };
};

/**
 * Builds the brownfield.config.json content for the scaffolded targets,
 * matching the manual steps in docs getting-started/ios.mdx (step 5) and
 * android.mdx (step 7) and the CLI config schema (packages/cli/src/types.ts,
 * strict additionalProperties: false).
 *
 * Idempotency strategy: the content is derived deterministically from the
 * scaffolded project state (framework/module names), so re-running the
 * scaffold overwrites with byte-identical content. Users customizing it are
 * taking over responsibility; a re-scaffold with the same names is a no-op.
 */
export function createBrownfieldFileConfig({
  iosFrameworkName,
  androidModuleName,
}: {
  iosFrameworkName: string;
  androidModuleName: string;
}): BrownfieldFileConfig {
  return {
    $schema: 'https://oss.callstack.com/react-native-brownfield/schema.json',
    ios: {
      // iOS packaging builds the generated framework target by scheme name.
      scheme: iosFrameworkName,
      configuration: 'Release',
    },
    android: {
      // Gradle module name of the generated library module.
      moduleName: androidModuleName,
      variant: 'Release',
    },
  };
}

/**
 * Writes brownfield.config.json at the project root. Deterministic output:
 * same inputs -> same bytes, so re-running the scaffold never duplicates or
 * drifts the file.
 *
 * Skips writing (returns null) when another Brownfield config source already
 * exists: packages/cli loadBrownfieldConfig fails hard on multiple config
 * files, so an existing brownfield.config.js or a legacy `brownfield` key in
 * package.json takes precedence over generating a JSON one.
 */
export function writeBrownfieldFileConfig(
  projectRoot: string,
  names: { iosFrameworkName: string; androidModuleName: string }
): string | null {
  const configPath = path.join(projectRoot, 'brownfield.config.json');

  const jsConfigPath = path.join(projectRoot, 'brownfield.config.js');
  if (fs.existsSync(jsConfigPath)) {
    Logger.logDebug(
      `Skipping brownfield.config.json: ${jsConfigPath} already exists.`
    );
    return null;
  }

  const pkg = readPackageJson(projectRoot);
  if ('brownfield' in pkg) {
    Logger.logDebug(
      'Skipping brownfield.config.json: legacy "brownfield" key in package.json already exists.'
    );
    return null;
  }

  // Trailing newline, same as writePackageJson: the idempotency guard below
  // compares bytes, so the written content must be exactly what a
  // newline-normalizing toolchain (editorconfig, prettier, git text eol)
  // leaves on disk. Content + '\n' is both the written bytes and the
  // comparison value, so the guard cannot be broken by an external normalizer.
  const content =
    JSON.stringify(createBrownfieldFileConfig(names), null, 2) + '\n';
  const prev = fs.existsSync(configPath)
    ? fs.readFileSync(configPath, 'utf8')
    : null;

  if (prev !== content) {
    fs.writeFileSync(configPath, content, 'utf8');
    Logger.logDebug(`Wrote ${configPath}`);
  }
  return configPath;
}
