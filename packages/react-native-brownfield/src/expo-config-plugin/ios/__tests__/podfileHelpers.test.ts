import { describe, expect, it } from 'vitest';

import { modifyPodfile } from '../podfileHelpers';

describe('modifyPodfile', () => {
  it('inserts Brownfield post_install blocks before the post_install closing end', () => {
    const podfile = `target 'ExpoApp56' do
  use_expo_modules!

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
    )
  end
end
`;

    const patched = modifyPodfile(podfile, 'BrownfieldLib', 56);

    expect(patched).toContain(
      '# >>> react-native-brownfield Expo SDK 55+ swift defines >>>'
    );
    expect(patched).toContain(
      '# >>> react-native-brownfield React prebuilt interoperability >>>'
    );
    expect(patched).toContain(
      '# >>> react-native-brownfield Debug swift interface overrides >>>'
    );
    expect(patched).toMatch(
      /react_native_post_install\([\s\S]*?# >>> react-native-brownfield Expo SDK 55\+ swift defines >>>[\s\S]*?# >>> react-native-brownfield React prebuilt interoperability >>>[\s\S]*?# >>> react-native-brownfield Debug swift interface overrides >>>[\s\S]*?\n {2}end\n {2}# Brownfield framework target for packaging as XCFramework/
    );
  });

  it('replaces stale Brownfield post_install blocks instead of duplicating them', () => {
    const podfile = `target 'ExpoApp56' do
  post_install do |installer|
    # >>> react-native-brownfield Expo SDK 55+ swift defines >>>
    old sdk 55 block
    # <<< react-native-brownfield Expo SDK 55+ swift defines <<<
    # >>> react-native-brownfield React prebuilt interoperability >>>
    old react prebuilt block
    # <<< react-native-brownfield React prebuilt interoperability <<<
    # >>> react-native-brownfield Debug swift interface overrides >>>
    old swift block
    # <<< react-native-brownfield Debug swift interface overrides <<<
  end
end
`;

    const patched = modifyPodfile(podfile, 'BrownfieldLib', 56);

    expect(patched).not.toContain('old sdk 55 block');
    expect(patched).not.toContain('old react prebuilt block');
    expect(patched).not.toContain('old swift block');
    expect(
      patched.match(
        /# >>> react-native-brownfield Expo SDK 55\+ swift defines >>>/g
      )
    ).toHaveLength(1);
    expect(
      patched.match(
        /# >>> react-native-brownfield React prebuilt interoperability >>>/g
      )
    ).toHaveLength(1);
    expect(
      patched.match(
        /# >>> react-native-brownfield Debug swift interface overrides >>>/g
      )
    ).toHaveLength(1);
    expect(patched).toContain(
      "config.build_settings['SWIFT_EMIT_MODULE_INTERFACE'] = 'NO'"
    );
    expect(patched).toContain(
      "flags = Array(config.build_settings['OTHER_SWIFT_FLAGS']).flatten.compact.map(&:to_s).reject(&:empty?).join(' ').strip"
    );
    expect(patched).toContain(
      "unless flags.include?('-no-verify-emitted-module-interface')"
    );
    expect(patched).toContain(
      'framework module React {\n      umbrella header "React_Core/React_Core-umbrella.h"'
    );
    expect(patched).toContain(
      "normalize_build_setting = lambda do |value, fallback = '$(inherited)'|"
    );
    expect(patched).toContain(
      "Array(value).flatten.compact.map(&:to_s).reject(&:empty?).join(' ').strip"
    );
    expect(patched).toContain('search_path_keys = %w[');
    expect(patched).toContain('HEADER_SEARCH_PATHS');
    expect(patched).toContain('USER_HEADER_SEARCH_PATHS');
  });
});
