import * as fs from 'node:fs';
import * as path from 'node:path';

import type { AndroidConfig } from '@expo/config-plugins';

import { Logger } from '../../logging';

export type AndroidManifestMetaDataEntry = {
  name: string;
  value: string;
};

export type AndroidStringResourceEntry = {
  name: string;
  value: string;
};

const APP_MANIFEST_PATH_SEGMENTS = [
  'app',
  'src',
  'main',
  'AndroidManifest.xml',
];
const APP_STRINGS_PATH_SEGMENTS = [
  'app',
  'src',
  'main',
  'res',
  'values',
  'strings.xml',
];
const APPLICATION_BLOCK_REGEX = /<application\b[\s\S]*?<\/application>/;
const META_DATA_TAG_REGEX =
  /<meta-data\b[\s\S]*?(?:\/>|>[\s\S]*?<\/meta-data>)/g;
const STRING_TAG_REGEX = /<string\b[\s\S]*?>[\s\S]*?<\/string>/g;
const STRING_REFERENCE_REGEX = /^@string\/([A-Za-z0-9_.]+)$/;
const EXPO_UPDATES_META_DATA_PREFIX = 'expo.modules.updates.';

export function readExpoUpdatesApplicationMetaData(
  androidDir: string
): AndroidManifestMetaDataEntry[] {
  const manifestPath = path.join(androidDir, ...APP_MANIFEST_PATH_SEGMENTS);

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

export function extractExpoUpdatesApplicationMetaDataFromAndroidManifest(
  androidManifest: AndroidConfig.Manifest.AndroidManifest
): AndroidManifestMetaDataEntry[] {
  const application = androidManifest.manifest.application?.[0];

  if (!application?.['meta-data']) {
    return [];
  }

  return application['meta-data']
    .map((metaDataItem) =>
      parseMetaDataAttributes(
        metaDataItem.$['android:name'],
        metaDataItem.$['android:value'] ?? metaDataItem.$['android:resource']
      )
    )
    .filter(
      (metaDataEntry): metaDataEntry is AndroidManifestMetaDataEntry =>
        metaDataEntry !== null
    );
}

export function extractExpoUpdatesApplicationMetaData(
  manifestContent: string
): AndroidManifestMetaDataEntry[] {
  const applicationBlock = manifestContent.match(APPLICATION_BLOCK_REGEX)?.[0];

  if (!applicationBlock) {
    return [];
  }

  return (applicationBlock.match(META_DATA_TAG_REGEX) ?? [])
    .map(parseMetaDataTag)
    .filter(
      (metaDataEntry): metaDataEntry is AndroidManifestMetaDataEntry =>
        metaDataEntry !== null
    );
}

export function renderLibraryManifestApplication(
  metaDataEntries: AndroidManifestMetaDataEntry[]
): string {
  if (metaDataEntries.length === 0) {
    return '';
  }

  const renderedMetaDataEntries = metaDataEntries
    .map(
      ({ name, value }) =>
        `    <meta-data android:name="${name}" android:value="${value}" />`
    )
    .join('\n');

  return `  <application>\n${renderedMetaDataEntries}\n  </application>`;
}

export function readExpoUpdatesStringResources(
  androidDir: string,
  metaDataEntries: AndroidManifestMetaDataEntry[]
): AndroidStringResourceEntry[] {
  const stringResourceNames = [
    ...new Set(
      metaDataEntries
        .map(({ value }) => value.match(STRING_REFERENCE_REGEX)?.[1])
        .filter((name): name is string => name !== undefined)
    ),
  ];

  if (stringResourceNames.length === 0) {
    return [];
  }

  const stringsPath = path.join(androidDir, ...APP_STRINGS_PATH_SEGMENTS);

  if (!fs.existsSync(stringsPath)) {
    Logger.logDebug(
      `App strings not found, skipping string resource copy: ${stringsPath}`
    );
    return [];
  }

  const stringsContent = fs.readFileSync(stringsPath, 'utf8');

  return extractExpoUpdatesStringResourcesFromXml(
    stringsContent,
    metaDataEntries
  );
}

export function extractExpoUpdatesStringResourcesFromResourcesXml(
  stringsXml: AndroidConfig.Resources.ResourceXML,
  metaDataEntries: AndroidManifestMetaDataEntry[]
): AndroidStringResourceEntry[] {
  const stringResourceNames = getReferencedStringResourceNames(metaDataEntries);

  if (stringResourceNames.length === 0) {
    return [];
  }

  return stringResourceNames
    .map((name) => {
      const stringItem = stringsXml.resources.string?.find(
        (item) => item.$.name === name
      );

      if (!stringItem || stringItem._ === undefined) {
        return null;
      }

      return { name, value: stringItem._ };
    })
    .filter(
      (stringResource): stringResource is AndroidStringResourceEntry =>
        stringResource !== null
    );
}

export function renderLibraryStringResources(
  stringResources: AndroidStringResourceEntry[]
): string {
  if (stringResources.length === 0) {
    return '';
  }

  return stringResources
    .map(({ name, value }) => `  <string name="${name}">${value}</string>`)
    .join('\n');
}

function parseMetaDataTag(
  metaDataTag: string
): AndroidManifestMetaDataEntry | null {
  const name = getAndroidAttribute(metaDataTag, 'name');
  const value = getAndroidAttribute(metaDataTag, 'value');

  return parseMetaDataAttributes(name, value);
}

function parseMetaDataAttributes(
  name: string | undefined,
  value: string | undefined
): AndroidManifestMetaDataEntry | null {
  if (!name?.startsWith(EXPO_UPDATES_META_DATA_PREFIX)) {
    return null;
  }

  if (value === undefined) {
    return null;
  }

  return { name, value };
}

function extractStringResource(
  stringsContent: string,
  resourceName: string
): AndroidStringResourceEntry | null {
  const stringTag = (stringsContent.match(STRING_TAG_REGEX) ?? []).find(
    (tag) => getAttribute(tag, 'name') === resourceName
  );

  if (!stringTag) {
    return null;
  }

  const value = stringTag.match(/>([\s\S]*?)<\/string>/)?.[1];

  if (value === undefined) {
    return null;
  }

  return { name: resourceName, value };
}

function extractExpoUpdatesStringResourcesFromXml(
  stringsContent: string,
  metaDataEntries: AndroidManifestMetaDataEntry[]
): AndroidStringResourceEntry[] {
  const stringResourceNames = getReferencedStringResourceNames(metaDataEntries);

  if (stringResourceNames.length === 0) {
    return [];
  }

  return stringResourceNames
    .map((name) => extractStringResource(stringsContent, name))
    .filter(
      (stringResource): stringResource is AndroidStringResourceEntry =>
        stringResource !== null
    );
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

function getAndroidAttribute(
  metaDataTag: string,
  attributeName: string
): string | undefined {
  return getAttribute(metaDataTag, `android:${attributeName}`);
}

function getAttribute(tag: string, attributeName: string): string | undefined {
  const attributeRegex = new RegExp(
    `\\b${attributeName}\\s*=\\s*(['"])([\\s\\S]*?)\\1`
  );

  return tag.match(attributeRegex)?.[2];
}
