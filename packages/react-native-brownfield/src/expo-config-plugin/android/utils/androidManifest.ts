import type { AndroidConfig } from '@expo/config-plugins';

/** Classification: generic Android utility data shape. */
export type AndroidManifestMetaDataEntry = {
  name: string;
  value: string;
};

/** Classification: generic Android utility data shape. */
export type AndroidStringResourceEntry = {
  name: string;
  value: string;
};

const APPLICATION_BLOCK_REGEX = /<application\b[\s\S]*?<\/application>/;
const META_DATA_TAG_REGEX =
  /<meta-data\b[\s\S]*?(?:\/>|>[\s\S]*?<\/meta-data>)/g;
const STRING_TAG_REGEX = /<string\b[\s\S]*?>[\s\S]*?<\/string>/g;

/** Classification: generic Android utility parser. */
export function extractApplicationMetaData(
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

/** Classification: generic Android utility parser. */
export function extractApplicationMetaDataFromAndroidManifest(
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

/** Classification: generic Android utility parser. */
export function extractStringResourcesFromXml(
  stringsContent: string,
  resourceNames: string[]
): AndroidStringResourceEntry[] {
  if (resourceNames.length === 0) {
    return [];
  }

  return resourceNames
    .map((name) => extractStringResource(stringsContent, name))
    .filter(
      (stringResource): stringResource is AndroidStringResourceEntry =>
        stringResource !== null
    );
}

/** Classification: generic Android utility parser. */
export function extractStringResourcesFromResourcesXml(
  stringsXml: AndroidConfig.Resources.ResourceXML,
  resourceNames: string[]
): AndroidStringResourceEntry[] {
  if (resourceNames.length === 0) {
    return [];
  }

  return resourceNames
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

/** Classification: generic Android utility renderer. */
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

/** Classification: generic Android utility renderer. */
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
  if (name === undefined || value === undefined) {
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
