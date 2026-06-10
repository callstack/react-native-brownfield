import fs from 'node:fs';
import path from 'node:path';

const WORKLETS_IMPORTED_LOCATION_COMPAT_BLOCK = `if (\${CMAKE_BUILD_TYPE} MATCHES "Debug")
  set(WORKLETS_CXX_BUILD_TYPE "Debug")
  set(WORKLETS_LEGACY_BUILD_TYPE "debug")
else ()
  set(WORKLETS_CXX_BUILD_TYPE "RelWithDebInfo")
  set(WORKLETS_LEGACY_BUILD_TYPE "release")
endif ()

file(GLOB WORKLETS_IMPORTED_LOCATION_CANDIDATES
  "\${REACT_NATIVE_WORKLETS_DIR}/android/build/intermediates/cxx/\${WORKLETS_CXX_BUILD_TYPE}/*/obj/\${ANDROID_ABI}/libworklets.so"
)

if (WORKLETS_IMPORTED_LOCATION_CANDIDATES)
  list(GET WORKLETS_IMPORTED_LOCATION_CANDIDATES 0 WORKLETS_IMPORTED_LOCATION)
else ()
  set(
    WORKLETS_IMPORTED_LOCATION
    "\${REACT_NATIVE_WORKLETS_DIR}/android/build/intermediates/cmake/\${WORKLETS_LEGACY_BUILD_TYPE}/obj/\${ANDROID_ABI}/libworklets.so"
  )
endif ()
`;

const WORKLETS_BUILD_TYPE_BLOCK_REGEX =
  /if\s*\(\s*\$\{CMAKE_BUILD_TYPE\}\s*MATCHES\s*"Debug"\s*\)\s*\n\s*set\(\s*BUILD_TYPE\s*"debug"\s*\)\s*\n\s*else\s*\(\s*\)\s*\n\s*set\(\s*BUILD_TYPE\s*"release"\s*\)\s*\n\s*endif\s*\(\s*\)\s*/m;

const WORKLETS_OLD_IMPORTED_LOCATION =
  '"${REACT_NATIVE_WORKLETS_DIR}/android/build/intermediates/cmake/${BUILD_TYPE}/obj/${ANDROID_ABI}/libworklets.so"';
const WORKLETS_NEW_IMPORTED_LOCATION = '"${WORKLETS_IMPORTED_LOCATION}"';

const PATCH_TARGETS = [
  'node_modules/react-native-reanimated/android/CMakeLists.txt',
  'node_modules/expo-modules-core/android/cmake/main.cmake',
];

export function patchAndroidWorkletsImportPaths(projectRoot: string): void {
  for (const relativePath of PATCH_TARGETS) {
    const filePath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const originalContents = fs.readFileSync(filePath, 'utf8');
    const patchedContents = patchWorkletsImportPathContents(originalContents);

    if (patchedContents !== originalContents) {
      fs.writeFileSync(filePath, patchedContents, 'utf8');
    }
  }
}

export function patchWorkletsImportPathContents(contents: string): string {
  if (contents.includes('WORKLETS_IMPORTED_LOCATION_CANDIDATES')) {
    return contents;
  }

  if (!contents.includes(WORKLETS_OLD_IMPORTED_LOCATION)) {
    return contents;
  }

  const contentsWithCompatBuildType = contents.replace(
    WORKLETS_BUILD_TYPE_BLOCK_REGEX,
    `${WORKLETS_IMPORTED_LOCATION_COMPAT_BLOCK}\n`
  );

  if (contentsWithCompatBuildType === contents) {
    return contents;
  }

  return contentsWithCompatBuildType
    .replace(WORKLETS_OLD_IMPORTED_LOCATION, WORKLETS_NEW_IMPORTED_LOCATION);
}
