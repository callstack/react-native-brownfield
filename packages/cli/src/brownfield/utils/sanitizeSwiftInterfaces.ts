import fs from 'node:fs';
import path from 'node:path';

const SWIFT_INTERFACE_SUFFIXES = ['.swiftinterface', '.private.swiftinterface'];

function isSwiftInterfaceFile(filePath: string): boolean {
  return SWIFT_INTERFACE_SUFFIXES.some((suffix) => filePath.endsWith(suffix));
}

function removeSelfImports(contents: string, moduleName: string): string {
  return contents.replace(
    new RegExp(`^(?:@_exported\\s+)?import\\s+${moduleName}\\s*$`, 'gm'),
    ''
  );
}

function walkDirectory(rootPath: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
    const entryPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkDirectory(entryPath));
      continue;
    }

    files.push(entryPath);
  }

  return files;
}

export function sanitizeSwiftInterfaces({
  moduleName,
  rootPath,
}: {
  moduleName: string;
  rootPath: string;
}): number {
  if (!fs.existsSync(rootPath)) {
    return 0;
  }

  let updatedFiles = 0;

  for (const filePath of walkDirectory(rootPath)) {
    if (!isSwiftInterfaceFile(filePath)) {
      continue;
    }

    const original = fs.readFileSync(filePath, 'utf8');
    const sanitized = removeSelfImports(original, moduleName);

    if (sanitized === original) {
      continue;
    }

    fs.writeFileSync(filePath, sanitized);
    updatedFiles += 1;
  }

  return updatedFiles;
}
