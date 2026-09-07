/**
 * Writes large JS modules so Metro's main bundle is slower to download and execute.
 * Run: node scripts/generate-heavy-modules.js
 */
const fs = require('node:fs');
const path = require('node:path');

const outDir = path.join(__dirname, '../src/heavy/generated');
const chunkCount = 4;
const rowsPerChunk = 12000;
const padding = 'payload-'.repeat(8);

fs.mkdirSync(outDir, { recursive: true });

const exportNames = [];

for (let chunk = 0; chunk < chunkCount; chunk += 1) {
  const exportName = `heavyChunk${chunk}`;
  exportNames.push(exportName);
  const lines = [`export const ${exportName} = [`];
  for (let i = 0; i < rowsPerChunk; i += 1) {
    lines.push(`  "${exportName}-${i}-${padding}${i.toString(16)}",`);
  }
  lines.push('];');
  lines.push('');
  fs.writeFileSync(path.join(outDir, `${exportName}.js`), lines.join('\n'));
}

const barrel = `${exportNames
  .map((name) => `export { ${name} } from './${name}';`)
  .join('\n')}
`;
fs.writeFileSync(path.join(outDir, 'index.js'), barrel);

console.log(
  `Wrote ${chunkCount} heavy modules (${rowsPerChunk} rows each) to ${outDir}`
);
