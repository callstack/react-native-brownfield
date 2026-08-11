import { withPodfile, type ConfigPlugin } from '@expo/config-plugins';

import type { ResolvedBrownfieldPluginConfigWithIos } from '../types';

const FMT_FIX_MARKER =
  '# Fix fmt 11.0.2 consteval compilation error with Xcode 26.4+';
const FMT_FIX_MARKER_START = '# >>> react-native-brownfield fmt fix >>>';
const FMT_FIX_MARKER_END = '# <<< react-native-brownfield fmt fix <<<';
const LEGACY_FMT_FIX_BLOCK = new RegExp(
  [
    '\\n?\\s*',
    escapeRegExp(FMT_FIX_MARKER),
    "\\n\\s*fmt_base = File\\.join\\(installer\\.sandbox\\.pod_dir\\('fmt'\\), 'include', 'fmt', 'base\\.h'\\)",
    '\\n\\s*if File\\.exist\\?\\(fmt_base\\)',
    '\\n\\s*content = File\\.read\\(fmt_base\\)',
    "\\n\\s*patched = content\\.gsub\\(/\\^#\\\\s\\*define FMT_USE_CONSTEVAL 1\\$/, '# define FMT_USE_CONSTEVAL 0'\\)",
    '\\n\\s*if patched != content',
    '\\n\\s*File\\.chmod\\(0644, fmt_base\\)',
    '\\n\\s*File\\.write\\(fmt_base, patched\\)',
    '\\n\\s*end',
    '\\n\\s*end\\n?',
  ].join(''),
  'm'
);

const FMT_FIX_RUBY = `\
    ${FMT_FIX_MARKER_START}
    ${FMT_FIX_MARKER}
    fmt_base = File.join(installer.sandbox.pod_dir('fmt'), 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      content = File.read(fmt_base)
      patched = content.gsub(/^#\\s*define FMT_USE_CONSTEVAL 1$/, '# define FMT_USE_CONSTEVAL 0')
      if patched != content
        File.chmod(0644, fmt_base)
        File.write(fmt_base, patched)
      end
    end
    ${FMT_FIX_MARKER_END}`;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function injectFmtFixIntoPodfile(podfile: string): string {
  const withoutLegacyBlock = podfile.replace(LEGACY_FMT_FIX_BLOCK, '\n');
  const existingBlockPattern = new RegExp(
    `\\n?\\s*${escapeRegExp(FMT_FIX_MARKER_START)}[\\s\\S]*?${escapeRegExp(
      FMT_FIX_MARKER_END
    )}\\n?`,
    'm'
  );

  if (existingBlockPattern.test(withoutLegacyBlock)) {
    return withoutLegacyBlock.replace(
      existingBlockPattern,
      `\n${FMT_FIX_RUBY}\n`
    );
  }

  const lines = withoutLegacyBlock.split('\n');
  const postInstallIndex = lines.findIndex((line) =>
    /^\s*post_install do \|installer\|/.test(line)
  );

  if (postInstallIndex === -1) {
    return podfile;
  }

  const baseIndent = lines[postInstallIndex].match(/^(\s*)/)?.[1].length ?? 0;
  let insertionIndex = -1;

  for (let index = postInstallIndex + 1; index < lines.length; index += 1) {
    const endMatch = lines[index].match(/^(\s*)end\s*$/);
    if (!endMatch) {
      continue;
    }

    const endIndent = endMatch[1].length;
    if (endIndent === baseIndent) {
      insertionIndex = index;
      break;
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
