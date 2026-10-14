import { describe, expect, it } from 'vitest';

import { modifyPodfile } from '../podfileHelpers';

// Marker emitted by the Expo-only `ensureExpoDefinesForSDK55AndAbove` hook.
const EXPO_DEFINES_MARKER =
  '# >>> react-native-brownfield Expo SDK 55+ swift defines >>>';

const MAIN_TARGET = 'ExpoApp56';

function createPodfile(): string {
  return [
    "require File.join(File.dirname(`node --print \"require.resolve('expo/package.json')\"`), 'scripts/autolinking')",
    '',
    `target '${MAIN_TARGET}' do`,
    '  use_expo_modules!',
    '  config = use_native_modules!',
    '',
    '  post_install do |installer|',
    '    react_native_post_install(',
    '      installer,',
    '      config[:reactNativePath],',
    '      :mac_catalyst_enabled => false,',
    '    )',
    '  end',
    'end',
    '',
  ].join('\n');
}

describe('modifyPodfile', () => {
  it('renders the vanilla target block without Expo hooks when no Expo SDK version is given', () => {
    const modified = modifyPodfile(createPodfile(), 'BrownfieldLib');

    expect(modified).toContain("target 'BrownfieldLib' do");
    expect(modified).toContain('inherit! :complete');

    // The Expo target block marks the target as hosted by an Expo app; the
    // vanilla template must not.
    expect(modified).not.toContain('REACT_NATIVE_BROWNFIELD_USE_EXPO_HOST');

    // No Expo-only post_install hook is added for vanilla projects.
    expect(modified).not.toContain(EXPO_DEFINES_MARKER);
    expect(modified).not.toContain('EXPO_SDK_GTE_55');
    expect(modified.match(/post_install do \|installer\|/g)).toHaveLength(1);
  });

  it('does not require an Expo post_install block when the host is vanilla', () => {
    // RN CLI Podfiles have no Expo post_install hooks, so the vanilla path must
    // not depend on them and must not raise any version-related error.
    const plainPodfile = `target 'BrownTestApp' do
  config = use_native_modules!
  use_react_native!
end
`;

    expect(() => modifyPodfile(plainPodfile, 'BrownfieldLib')).not.toThrow();
    expect(modifyPodfile(plainPodfile, 'BrownfieldLib')).toContain(
      "target 'BrownfieldLib' do"
    );
  });

  it('throws for an unknown Expo SDK version detected as negative', () => {
    expect(() => modifyPodfile(createPodfile(), 'BrownfieldLib', -1)).toThrow(
      /Expo SDK unknown is not supported/
    );
  });

  it('throws for Expo SDK versions below the minimum supported major version', () => {
    expect(() => modifyPodfile(createPodfile(), 'BrownfieldLib', 55)).toThrow(
      /Expo SDK 55 is not supported/
    );
  });

  it('applies the Expo defines hook for supported Expo SDK versions', () => {
    const modified = modifyPodfile(createPodfile(), 'BrownfieldLib', 56);

    expect(modified).toContain("target 'BrownfieldLib' do");
    expect(modified).toContain('REACT_NATIVE_BROWNFIELD_USE_EXPO_HOST');
    expect(modified).toContain(EXPO_DEFINES_MARKER);
    expect(modified).toContain('EXPO_SDK_GTE_55');

    // SDK 56+ raises the default deployment target used by the hook.
    expect(modified).toContain(
      "(defined?(podfile_properties) && podfile_properties['ios.deploymentTarget']) || '16.4'"
    );
  });

  it('adds the framework target only once across repeated runs', () => {
    const once = modifyPodfile(createPodfile(), 'BrownfieldLib');
    const twice = modifyPodfile(once, 'BrownfieldLib');

    expect(twice).toBe(once);
    expect(twice.match(/target 'BrownfieldLib'/g)).toHaveLength(1);
  });

  it('adds the Expo defines hook only once across repeated runs', () => {
    const once = modifyPodfile(createPodfile(), 'BrownfieldLib', 56);
    const twice = modifyPodfile(once, 'BrownfieldLib', 56);

    // The marker contains a `+`, so count occurrences without regex semantics.
    expect(twice.split(EXPO_DEFINES_MARKER)).toHaveLength(2);
  });

  it('switches an existing vanilla framework target to the Expo host', () => {
    // A React Native CLI app that adds Expo after it was scaffolded.
    const vanilla = modifyPodfile(createPodfile(), 'BrownfieldLib');
    const expo = modifyPodfile(vanilla, 'BrownfieldLib', 58);

    expect(expo).toContain(
      "  target 'BrownfieldLib' do\n    ENV['REACT_NATIVE_BROWNFIELD_USE_EXPO_HOST'] = '1'\n"
    );
    expect(expo).toContain(EXPO_DEFINES_MARKER);
    expect(expo.match(/target 'BrownfieldLib'/g)).toHaveLength(1);
    expect(modifyPodfile(expo, 'BrownfieldLib', 58)).toBe(expo);
  });

  it('switches an existing target with CRLF line endings and a trailing comment', () => {
    const vanilla = modifyPodfile(createPodfile(), 'BrownfieldLib')
      .replace(
        "target 'BrownfieldLib' do",
        "target 'BrownfieldLib' do # framework"
      )
      .replace(/\n/g, '\r\n');
    const expo = modifyPodfile(vanilla, 'BrownfieldLib', 58);

    expect(expo).toContain(
      "  target 'BrownfieldLib' do # framework\r\n    ENV['REACT_NATIVE_BROWNFIELD_USE_EXPO_HOST'] = '1'\r\n"
    );
  });

  it('throws instead of silently skipping when the existing target line cannot be found', () => {
    const podfile = `${createPodfile()}\n# target 'BrownfieldLib' is defined elsewhere\n`;

    expect(() => modifyPodfile(podfile, 'BrownfieldLib', 58)).toThrow(
      /Couldn't find the "target 'BrownfieldLib' do" line/
    );
  });

  it('throws when the Podfile has no main target to insert after', () => {
    expect(() => modifyPodfile('# empty Podfile\n', 'BrownfieldLib')).toThrow(
      /Could not find main target in Podfile/
    );
  });
});
