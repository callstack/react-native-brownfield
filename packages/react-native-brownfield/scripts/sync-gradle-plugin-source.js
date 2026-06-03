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
const sourceVersionCatalogPath = path.join(
  repoRoot,
  'gradle-plugins',
  'react',
  'gradle',
  'libs.versions.toml'
);

const targetRoot = path.join(packageRoot, 'gradle-plugin');
const targetBrownfieldPath = path.join(targetRoot, 'brownfield');
const targetGradlePath = path.join(targetRoot, 'gradle');

if (process.argv.includes('--clean')) {
  fs.rmSync(targetRoot, { recursive: true, force: true });
  process.exit(0);
}

fs.rmSync(targetRoot, { recursive: true, force: true });
fs.mkdirSync(targetGradlePath, { recursive: true });

fs.cpSync(sourceBrownfieldPath, targetBrownfieldPath, {
  recursive: true,
  filter(source) {
    const relativePath = path.relative(sourceBrownfieldPath, source);
    const parts = relativePath.split(path.sep);

    return !parts.some((part) =>
      ['build', '.gradle', 'local.properties', '.kotlin', 'bin'].includes(part)
    );
  },
});

fs.copyFileSync(
  sourceVersionCatalogPath,
  path.join(targetGradlePath, 'libs.versions.toml')
);
