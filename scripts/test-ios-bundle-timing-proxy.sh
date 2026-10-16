#!/usr/bin/env bash
# Run on macOS: bash scripts/test-ios-bundle-timing-proxy.sh
# Compile the production observer against minimal RN declarations and reproduce
# RCTBridgeProxy's NSProxy forwarding behavior without an iOS simulator.
set -euo pipefail
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/brownfield-timing-proxy.XXXXXX")"
trap 'rm -rf "$test_dir"' EXIT
mkdir -p "$test_dir/React"

cat > "$test_dir/React/RCTBridge.h" <<'EOF'
#import <Foundation/Foundation.h>
@class RCTPerformanceLogger;
@interface RCTBridge : NSObject
@property RCTPerformanceLogger *performanceLogger;
@end
EOF

cat > "$test_dir/React/RCTPerformanceLogger.h" <<'EOF'
#import <Foundation/Foundation.h>
@interface RCTPerformanceLogger : NSObject
@property NSArray<NSNumber *> *values;
- (NSArray<NSNumber *> *)valuesForTags;
@end
EOF

cat > "$test_dir/React/RCTConstants.h" <<'EOF'
#define RCTJavaScriptDidLoadNotification @"RCTJavaScriptDidLoadNotification"
#define RCTJavaScriptDidFailToLoadNotification @"RCTJavaScriptDidFailToLoadNotification"
EOF

cat > "$test_dir/React/RCTPLTag.h" <<'EOF'
#pragma once
typedef NS_ENUM(NSUInteger, RCTPLTag) { RCTPLScriptDownload, RCTPLScriptExecution };
EOF

cat > "$test_dir/main.m" <<'EOF'
#import "React/RCTBridge.h"
#import "React/RCTPerformanceLogger.h"
#import "JSBundleTimingObserver.h"

@implementation RCTBridge
@end
@implementation RCTPerformanceLogger
- (NSArray<NSNumber *> *)valuesForTags { return self.values; }
@end

// Match RN's NSProxy base and forwarding behavior, rather than an NSObject fake.
@interface RCTBridgeProxy : NSProxy
@property (nonatomic, strong) RCTPerformanceLogger *performanceLogger;
@end
@implementation RCTBridgeProxy
@synthesize performanceLogger = _performanceLogger;
- (NSMethodSignature *)methodSignatureForSelector:(SEL)selector {
  return [RCTBridge instanceMethodSignatureForSelector:selector];
}
- (void)forwardInvocation:(NSInvocation *)invocation {}
@end

int main(void) {
  @autoreleasepool {
    RCTBridgeProxy *bridge = [RCTBridgeProxy alloc];
    RCTPerformanceLogger *logger = [RCTPerformanceLogger new];
    logger.values = @[@100, @125, @200, @209];
    bridge.performanceLogger = logger;
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTInstanceDidLoadBundle" object:nil];
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTJavaScriptDidLoadNotification" object:nil userInfo:@{@"bridge": bridge}];
    BOOL passed = [JSBundleTimingObserver.jsBundleLoadTime isEqual:@25] && [JSBundleTimingObserver.jsBundleEvaluationTime isEqual:@9];
    NSLog(@"%@: NSProxy timing capture load=%@ execute=%@", passed ? @"PASS" : @"FAIL", JSBundleTimingObserver.jsBundleLoadTime, JSBundleTimingObserver.jsBundleEvaluationTime);
    return passed ? 0 : 1;
  }
}
EOF

xcrun clang -fobjc-arc -fmodules -fmodules-cache-path="$test_dir/cache" \
  -I "$test_dir" -I "$repo_root/packages/react-native-brownfield/ios" \
  -framework Foundation \
  "$repo_root/packages/react-native-brownfield/ios/JSBundleTimingObserver.m" \
  "$test_dir/main.m" -o "$test_dir/test"
"$test_dir/test"
