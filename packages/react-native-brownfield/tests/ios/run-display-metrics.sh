#!/usr/bin/env bash
# Requires a booted iOS simulator. No RN app or Metro server is required.
set -euo pipefail
package_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/brownfield-display-tests.XXXXXX")"
trap 'rm -rf "$test_dir"' EXIT
sdk="$(xcrun --sdk iphonesimulator --show-sdk-path)"
target="$(uname -m)-apple-ios15.1-simulator"
cat > "$test_dir/bridge.m" <<'STUB'
#import "BrownfieldPerformanceBridge.h"
@implementation BrownfieldPerformanceBridge
+ (BOOL)dispatchToJavaScript:(dispatch_block_t)block { return NO; }
@end
STUB
xcrun --sdk iphonesimulator clang -c -fobjc-arc -isysroot "$sdk" -target "$target" \
  -I "$package_dir/ios" "$test_dir/bridge.m" -o "$test_dir/bridge.o"
for configuration in Debug Release; do
  flags=()
  if [[ "$configuration" == Release ]]; then flags+=(-O); else flags+=(-Onone -D DEBUG); fi
  xcrun --sdk iphonesimulator swiftc "${flags[@]}" -sdk "$sdk" -target "$target" \
    -module-cache-path "$test_dir/cache" \
    -import-objc-header "$package_dir/ios/BrownfieldPerformanceBridge.h" \
    "$package_dir/ios/BrownfieldDisplayMetrics.swift" \
    "$package_dir/tests/ios/display-metrics.swift" "$test_dir/bridge.o" -o "$test_dir/test"
  xcrun simctl spawn booted "$test_dir/test"
done
