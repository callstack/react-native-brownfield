/**
 * Copies the Brownfield Gradle plugin source from gradle-plugins/react/brownfield/
 * into packages/react-native-brownfield/gradle-plugin/brownfield/ so that the
 * plugin source is included in the published npm package.
 *
 * This enables consumers to use the plugin as a composite build via includeBuild
 * from node_modules instead of downloading it from Maven Central — useful for
 * local patching or working with an unreleased version.
 *
 * Run with --clean to remove the copied output (e.g. after publishing or testing).
 *
 * Usage:
 *   node sync-gradle-plugin-source.js          # copy
 *   node sync-gradle-plugin-source.js --clean  # remove
 */
const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

const sourceBrownfieldPath = path.join(
  repoRoot,
  'gradle-plugins',
  'react',
  'brownfield'
);

const targetRoot = path.join(packageRoot, 'gradle-plugin');
const targetBrownfieldPath = path.join(targetRoot, 'brownfield');

if (process.argv.includes('--clean')) {
  // Remove the copied gradle-plugin directory from the package
  fs.rmSync(targetRoot, { recursive: true, force: true });
  process.exit(0);
}

if (!fs.existsSync(sourceBrownfieldPath)) {
  console.error(`Error: Source path not found: ${sourceBrownfieldPath}`);
  console.error('This script must be run from within the monorepo.');
  process.exit(1);
}

// Always start from a clean slate to avoid stale files
fs.rmSync(targetRoot, { recursive: true, force: true });

fs.cpSync(sourceBrownfieldPath, targetBrownfieldPath, {
  recursive: true,
  // Exclude Gradle build artefacts and local state that should not be shipped
  filter(source) {
    const relativePath = path.relative(sourceBrownfieldPath, source);
    const parts = relativePath.split(path.sep);

    return !parts.some((part) =>
      ['build', '.gradle', 'local.properties', '.kotlin', 'bin'].includes(part)
    );
  },
});
