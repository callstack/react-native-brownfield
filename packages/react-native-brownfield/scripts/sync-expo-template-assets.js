const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.resolve(__dirname, '..');
const sourceTemplateRoot = path.join(
  packageRoot,
  'src',
  'expo-config-plugin',
  'template'
);
const targetTemplateRoots = [
  path.join(packageRoot, 'lib', 'commonjs', 'expo-config-plugin', 'template'),
  path.join(packageRoot, 'lib', 'module', 'expo-config-plugin', 'template'),
];
const templateDirectories = ['android', 'ios'];

for (const targetTemplateRoot of targetTemplateRoots) {
  fs.mkdirSync(targetTemplateRoot, { recursive: true });

  for (const directory of templateDirectories) {
    const sourceDir = path.join(sourceTemplateRoot, directory);
    const targetDir = path.join(targetTemplateRoot, directory);

    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.cpSync(sourceDir, targetDir, { recursive: true });
  }
}
