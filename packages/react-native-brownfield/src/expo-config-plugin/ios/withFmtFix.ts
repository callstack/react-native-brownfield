import { withPodfile, type ConfigPlugin } from '@expo/config-plugins';

import type { ResolvedBrownfieldPluginConfigWithIos } from '../types';

const FMT_FIX_MARKER =
  '# Fix fmt 11.0.2 consteval compilation error with Xcode 26.4+';

const FMT_FIX_RUBY = `\
    ${FMT_FIX_MARKER}
    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      patched = content.gsub(/^#\\s*define FMT_USE_CONSTEVAL 1$/, '# define FMT_USE_CONSTEVAL 0')
      if patched != content
        File.chmod(0644, fmt_base)
        File.write(fmt_base, patched)
      end
    end`;

export function injectFmtFixIntoPodfile(podfile: string): string {
  if (
    podfile.includes(FMT_FIX_MARKER) ||
    podfile.includes('react_native_brownfield_patch_fmt_consteval')
  ) {
    return podfile;
  }

  const lines = podfile.split('\n');
  const postInstallIndex = lines.findIndex((line) =>
    /^\s*post_install do \|installer\|/.test(line)
  );

  if (postInstallIndex === -1) {
    return podfile;
  }

  let depth = 0;
  let insertionIndex = -1;

  for (let index = postInstallIndex; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();

    if (trimmed.endsWith(' do |installer|')) {
      depth += 1;
      continue;
    }

    if (trimmed === 'end') {
      depth -= 1;

      if (depth === 0) {
        insertionIndex = index;
        break;
      }
    }
  }

  if (insertionIndex === -1) {
    return podfile;
  }

  lines.splice(insertionIndex, 0, FMT_FIX_RUBY);
  return lines.join('\n');
}

export const withFmtFix: ConfigPlugin<ResolvedBrownfieldPluginConfigWithIos> = (
  config
) =>
  withPodfile(config, (podfileConfig) => {
    podfileConfig.modResults.contents = injectFmtFixIntoPodfile(
      podfileConfig.modResults.contents
    );

    return podfileConfig;
  });
