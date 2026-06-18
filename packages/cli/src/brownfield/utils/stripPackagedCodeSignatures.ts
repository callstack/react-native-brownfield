import fs from 'node:fs';
import path from 'node:path';

function visitDirectories(rootPath: string, visitor: (dirPath: string) => void) {
  const pending = [rootPath];

  while (pending.length > 0) {
    const currentPath = pending.pop();

    if (!currentPath || !fs.existsSync(currentPath)) {
      continue;
    }

    visitor(currentPath);

    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      pending.push(path.join(currentPath, entry.name));
    }
  }
}

export function stripPackagedCodeSignatures(packageDir: string) {
  visitDirectories(packageDir, (dirPath) => {
    const codeSignaturePath = path.join(dirPath, '_CodeSignature');

    if (fs.existsSync(codeSignaturePath)) {
      fs.rmSync(codeSignaturePath, { recursive: true, force: true });
    }
  });
}
