import type { XcodeProject } from '@expo/config-plugins';

import { Logger } from '../../logging';
import { SourceModificationError } from '../../errors/SourceModificationError';
import { ensureTargetHasFileReferenceInResourcesBuildPhase } from '../xcodeHelpers';

type PbxFileReference = {
  [key: string]: unknown;
  name?: string;
  path?: string;
};

type PbxGroupLike = {
  [key: string]: unknown;
  name?: string;
  path?: string;
  children?: Array<{ value?: string; comment?: string } | string>;
};

const EXPO_PLIST_FILE_NAME = 'Expo.plist';
const EXPO_PLIST_PRIMARY_RELATIVE_PATH = 'Supporting/Expo.plist';
const RESOURCES_BUILD_PHASE_COMMENT = 'Resources test comment';
const EXPO_PLIST_RESOURCE_COMMENT = 'Expo.plist in Resources';

function normalizePbxString(value: unknown): string {
  return String(value ?? '').replace(/^"(.*)"$/, '$1');
}

function normalizePbxPathLike(value: unknown): string {
  return normalizePbxString(value).replace(/^\.\//, '');
}

function isSupportingGroup(group: PbxGroupLike): boolean {
  const groupName = normalizePbxString(group.name);
  const groupPath = normalizePbxString(group.path);

  return (
    groupName === 'Supporting' ||
    groupPath === 'Supporting' ||
    groupPath.endsWith('/Supporting')
  );
}

function groupContainsFileReference(
  group: PbxGroupLike,
  fileRefUuid: string
): boolean {
  const children = Array.isArray(group.children) ? group.children : [];

  return children.some((child) => {
    if (typeof child === 'string') {
      return child === fileRefUuid;
    }

    return child?.value === fileRefUuid;
  });
}

function isPrimaryExpoPlistMatch(
  fileRefUuid: string,
  fileRef: PbxFileReference,
  groups?: Record<string, PbxGroupLike | string>
): boolean {
  const normalizedPath = normalizePbxPathLike(fileRef.path);
  const fileName = normalizePbxString(fileRef.name);

  if (
    normalizedPath === EXPO_PLIST_PRIMARY_RELATIVE_PATH ||
    normalizedPath.endsWith(`/${EXPO_PLIST_PRIMARY_RELATIVE_PATH}`)
  ) {
    return true;
  }

  if (
    normalizedPath !== EXPO_PLIST_FILE_NAME &&
    fileName !== EXPO_PLIST_FILE_NAME
  ) {
    return false;
  }

  return Object.entries(groups ?? {}).some(([groupUuid, group]) => {
    if (groupUuid.endsWith('_comment') || typeof group === 'string') {
      return false;
    }

    return (
      isSupportingGroup(group) && groupContainsFileReference(group, fileRefUuid)
    );
  });
}

/**
 * Selects an existing PBXFileReference for the app-level Expo plist.
 *
 * Matches either:
 * - a file reference whose own path is `Supporting/Expo.plist`
 * - or an `Expo.plist` file reference that lives under a `Supporting` PBXGroup
 */
export function selectExpoPlistFileReference(
  fileReferences: Record<string, PbxFileReference | string>,
  groups?: Record<string, PbxGroupLike | string>
): string | null {
  for (const [fileRefUuid, fileRef] of Object.entries(fileReferences)) {
    if (fileRefUuid.endsWith('_comment') || typeof fileRef === 'string') {
      continue;
    }

    if (isPrimaryExpoPlistMatch(fileRefUuid, fileRef, groups)) {
      return fileRefUuid;
    }
  }

  return null;
}

function getExpoPlistFileRefOrThrow(project: XcodeProject): string {
  const fileReferences = project.pbxFileReferenceSection() as Record<
    string,
    PbxFileReference | string
  >;
  const groups = (project as any).hash?.project?.objects?.PBXGroup as
    | Record<string, PbxGroupLike | string>
    | undefined;
  const existingExpoPlistFileRefUuid = selectExpoPlistFileReference(
    fileReferences,
    groups
  );

  if (existingExpoPlistFileRefUuid) {
    return existingExpoPlistFileRefUuid;
  }

  throw new SourceModificationError(
    `Could not find the "${EXPO_PLIST_PRIMARY_RELATIVE_PATH}" PBXFileReference needed for Expo.plist resource wiring`
  );
}

/**
 * Ensures the framework target contains the app-level `Supporting/Expo.plist`
 * in a `PBXResourcesBuildPhase`. This is idempotent and safe to call repeatedly.
 */
export function ensureFrameworkHasExpoPlistResource(
  project: XcodeProject,
  frameworkTargetUUID: string
): void {
  const expoPlistFileRefUuid = getExpoPlistFileRefOrThrow(project);
  const didAddExpoPlistResource =
    ensureTargetHasFileReferenceInResourcesBuildPhase(
      project,
      frameworkTargetUUID,
      expoPlistFileRefUuid,
      {
        resourcesBuildPhaseComment: RESOURCES_BUILD_PHASE_COMMENT,
        buildFileComment: EXPO_PLIST_RESOURCE_COMMENT,
      }
    );

  if (!didAddExpoPlistResource) {
    Logger.logDebug(
      'Framework resources already include Supporting/Expo.plist'
    );
    return;
  }

  Logger.logDebug(
    'Added Supporting/Expo.plist to framework PBXResourcesBuildPhase'
  );
}
