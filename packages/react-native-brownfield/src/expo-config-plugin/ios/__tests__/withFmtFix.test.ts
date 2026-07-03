import { describe, expect, it } from 'vitest';

import { injectFmtFixIntoPodfile } from '../withFmtFix';

describe('injectFmtFixIntoPodfile', () => {
  it('injects the fmt fix into an Expo post_install block', () => {
    const podfile = `target 'ExpoApp55' do
  use_expo_modules!

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
  end
end
`;

    const patched = injectFmtFixIntoPodfile(podfile);

    expect(patched).toContain(
      '# Fix fmt 11.0.2 consteval compilation error with Xcode 26.4+'
    );
    expect(patched).toContain('# >>> react-native-brownfield fmt fix >>>');
    expect(patched).toContain(
      "fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')"
    );
    expect(patched).toMatch(
      /react_native_post_install\([\s\S]*?\n\s+# Fix fmt 11\.0\.2 consteval compilation error with Xcode 26\.4\+\n[\s\S]*?\n\s+end\nend/
    );
  });

  it('is idempotent when the fix is already present', () => {
    const podfile = `post_install do |installer|
    # >>> react-native-brownfield fmt fix >>>
    # Fix fmt 11.0.2 consteval compilation error with Xcode 26.4+
    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    # <<< react-native-brownfield fmt fix <<<
end
`;

    const patched = injectFmtFixIntoPodfile(podfile);

    expect(
      patched.match(/# >>> react-native-brownfield fmt fix >>>/g)
    ).toHaveLength(1);
    expect(
      patched.match(/# <<< react-native-brownfield fmt fix <<</g)
    ).toHaveLength(1);
    expect(
      patched.match(
        /# Fix fmt 11\.0\.2 consteval compilation error with Xcode 26\.4\+/g
      )
    ).toHaveLength(1);
  });

  it('replaces the legacy unmarked fmt fix block with the marked variant', () => {
    const podfile = `post_install do |installer|
    # Fix fmt 11.0.2 consteval compilation error with Xcode 26.4+
    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      patched = content.gsub(/^#\\s*define FMT_USE_CONSTEVAL 1$/, '# define FMT_USE_CONSTEVAL 0')
      if patched != content
        File.chmod(0644, fmt_base)
        File.write(fmt_base, patched)
      end
    end
end
`;

    const patched = injectFmtFixIntoPodfile(podfile);

    expect(
      patched.match(
        /# Fix fmt 11\.0\.2 consteval compilation error with Xcode 26\.4\+/g
      )
    ).toHaveLength(1);
    expect(patched).toContain('# >>> react-native-brownfield fmt fix >>>');
    expect(patched).toContain('# <<< react-native-brownfield fmt fix <<<');
  });
});
