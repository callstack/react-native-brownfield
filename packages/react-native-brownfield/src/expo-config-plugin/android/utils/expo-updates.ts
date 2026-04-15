import * as fs from 'node:fs';
import * as path from 'node:path';

import { Logger } from '../../logging';
import {
  type AndroidManifestMetaDataEntry,
  type AndroidStringResourceEntry,
  extractApplicationMetaData,
  extractStringResourcesFromXml,
} from './androidManifest';

const APP_MANIFEST_PATH_SEGMENTS = ['src', 'main', 'AndroidManifest.xml'];
const APP_STRINGS_PATH_SEGMENTS = [
  'src',
  'main',
  'res',
  'values',
  'strings.xml',
];
const STRING_REFERENCE_REGEX = /^@string\/([A-Za-z0-9_.]+)$/;
const EXPO_UPDATES_META_DATA_PREFIX = 'expo.modules.updates.';

/**
 * Canonical Expo Updates extraction pipeline.
 *
 * This plugin copies values from the app's finalized Android files while running
 * inside `withDangerousMod` / `withFinalizedMod`. In that phase, the stable
 * cross-plugin input is the on-disk XML after Expo and other config plugins have
 * finished mutating it, so production extraction intentionally uses raw file
 * contents as the source of truth.
 *
 */

/** Classification: Expo Updates-specific logic used by production code. */
export function readExpoUpdatesApplicationMetaData(
  androidDir: string,
  appModuleName: string
): AndroidManifestMetaDataEntry[] {
  const manifestPath = path.join(
    androidDir,
    appModuleName,
    ...APP_MANIFEST_PATH_SEGMENTS
  );

  if (!fs.existsSync(manifestPath)) {
    Logger.logDebug(
      `App manifest not found, skipping metadata copy: ${manifestPath}`
    );
    return [];
  }

  return extractExpoUpdatesApplicationMetaData(
    fs.readFileSync(manifestPath, 'utf8')
  );
}

/** Classification: Expo Updates-specific logic used by production code. */
export function extractExpoUpdatesApplicationMetaData(
  manifestContent: string
): AndroidManifestMetaDataEntry[] {
  return extractApplicationMetaData(manifestContent).filter(
    isExpoUpdatesMetaDataEntry
  );
}

/** Classification: Expo Updates-specific logic used by production code. */
export function readExpoUpdatesStringResources(
  androidDir: string,
  appModuleName: string,
  metaDataEntries: AndroidManifestMetaDataEntry[]
): AndroidStringResourceEntry[] {
  const stringResourceNames = getReferencedStringResourceNames(metaDataEntries);

  if (stringResourceNames.length === 0) {
    return [];
  }

  const stringsPath = path.join(
    androidDir,
    appModuleName,
    ...APP_STRINGS_PATH_SEGMENTS
  );

  if (!fs.existsSync(stringsPath)) {
    Logger.logDebug(
      `App strings not found, skipping string resource copy: ${stringsPath}`
    );
    return [];
  }

  return extractStringResourcesFromXml(
    fs.readFileSync(stringsPath, 'utf8'),
    stringResourceNames
  );
}

function isExpoUpdatesMetaDataEntry(
  metaDataEntry: AndroidManifestMetaDataEntry
): boolean {
  return metaDataEntry.name.startsWith(EXPO_UPDATES_META_DATA_PREFIX);
}

function getReferencedStringResourceNames(
  metaDataEntries: AndroidManifestMetaDataEntry[]
): string[] {
  return [
    ...new Set(
      metaDataEntries
        .map(({ value }) => value.match(STRING_REFERENCE_REGEX)?.[1])
        .filter((name): name is string => name !== undefined)
    ),
  ];
}
