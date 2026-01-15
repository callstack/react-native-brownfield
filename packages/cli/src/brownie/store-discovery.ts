import fs from 'node:fs';
import path from 'node:path';
import { Project } from 'ts-morph';

export interface DiscoveredStore {
  name: string;
  schemaPath: string;
}

/**
 * Recursively finds all *.brownie.ts files in a directory.
 */
function findBrownieFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      findBrownieFiles(fullPath, files);
    } else if (entry.name.endsWith('.brownie.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Parses a brownie file and extracts store names from BrownieStores interface.
 */
function parseStoresFromFile(
  project: Project,
  filePath: string
): DiscoveredStore[] {
  const sourceFile = project.addSourceFileAtPath(filePath);
  const stores: DiscoveredStore[] = [];

  const modules = sourceFile.getModules();
  for (const mod of modules) {
    const moduleName = mod.getName();
    if (
      moduleName !== "'@callstack/brownie'" &&
      moduleName !== '"@callstack/brownie"'
    ) {
      continue;
    }

    const iface = mod.getInterface('BrownieStores');
    if (!iface) {
      continue;
    }

    for (const prop of iface.getProperties()) {
      stores.push({
        name: prop.getName(),
        schemaPath: filePath,
      });
    }
  }

  return stores;
}

/**
 * Discovers all brownie stores by parsing BrownieStores interface
 * from declare module '@callstack/brownie' blocks.
 */
export function discoverStores(
  rootDir: string = process.cwd()
): DiscoveredStore[] {
  const brownieFiles = findBrownieFiles(rootDir);

  if (brownieFiles.length === 0) {
    throw new Error(
      'No brownie store files found. Create a file ending with .brownie.ts ' +
        '(e.g., MyStore.brownie.ts)'
    );
  }

  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const allStores: DiscoveredStore[] = [];

  for (const filePath of brownieFiles) {
    const stores = parseStoresFromFile(project, filePath);
    allStores.push(...stores);
  }

  if (allStores.length === 0) {
    throw new Error(
      'No stores found in brownie files. Make sure to declare module ' +
        "'@callstack/brownie' with BrownieStores interface."
    );
  }

  const names = allStores.map((s) => s.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate store names found: ${[...new Set(duplicates)].join(', ')}`
    );
  }

  return allStores;
}
