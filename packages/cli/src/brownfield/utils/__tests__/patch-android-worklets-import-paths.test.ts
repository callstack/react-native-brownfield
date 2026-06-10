import { describe, expect, it } from 'vitest';

import { patchWorkletsImportPathContents } from '../patchAndroidWorkletsImportPaths.js';

describe('patchWorkletsImportPathContents', () => {
  it('patches legacy worklets import paths to support AGP cxx outputs', () => {
    const contents = `if(\${CMAKE_BUILD_TYPE} MATCHES "Debug")
  set(BUILD_TYPE "debug")
else()
  set(BUILD_TYPE "release")
endif()

add_library(worklets SHARED IMPORTED)

set_target_properties(
  worklets
  PROPERTIES
    IMPORTED_LOCATION
    "\${REACT_NATIVE_WORKLETS_DIR}/android/build/intermediates/cmake/\${BUILD_TYPE}/obj/\${ANDROID_ABI}/libworklets.so"
)`;

    const patched = patchWorkletsImportPathContents(contents);

    expect(patched).toContain('WORKLETS_IMPORTED_LOCATION_CANDIDATES');
    expect(patched).toContain(
      '"${REACT_NATIVE_WORKLETS_DIR}/android/build/intermediates/cxx/${WORKLETS_CXX_BUILD_TYPE}/*/obj/${ANDROID_ABI}/libworklets.so"'
    );
    expect(patched).toContain('IMPORTED_LOCATION');
    expect(patched).toContain('"${WORKLETS_IMPORTED_LOCATION}"');
    expect(patched).not.toContain(
      '"${REACT_NATIVE_WORKLETS_DIR}/android/build/intermediates/cmake/${BUILD_TYPE}/obj/${ANDROID_ABI}/libworklets.so"'
    );
  });

  it('patches the spaced CMake style used by Expo modules', () => {
    const contents = `if (\${CMAKE_BUILD_TYPE} MATCHES "Debug")
  set(BUILD_TYPE "debug")
else ()
  set(BUILD_TYPE "release")
endif ()

set_target_properties(
  worklets
  PROPERTIES
  IMPORTED_LOCATION
  "\${REACT_NATIVE_WORKLETS_DIR}/android/build/intermediates/cmake/\${BUILD_TYPE}/obj/\${ANDROID_ABI}/libworklets.so"
)`;

    const patched = patchWorkletsImportPathContents(contents);

    expect(patched).toContain('WORKLETS_IMPORTED_LOCATION_CANDIDATES');
    expect(patched).toContain('WORKLETS_LEGACY_BUILD_TYPE');
    expect(patched).toContain('"${WORKLETS_IMPORTED_LOCATION}"');
  });

  it('does not patch files that are already compatible', () => {
    const contents = 'WORKLETS_IMPORTED_LOCATION_CANDIDATES';

    expect(patchWorkletsImportPathContents(contents)).toBe(contents);
  });
});
