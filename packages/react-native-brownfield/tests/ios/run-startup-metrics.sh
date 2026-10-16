#!/usr/bin/env bash
# Run on macOS: bash packages/react-native-brownfield/tests/ios/run-startup-metrics.sh
# Compile the production observer against minimal RN declarations and reproduce
# RCTBridgeProxy's NSProxy forwarding behavior without an iOS simulator.
set -euo pipefail
package_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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
#import <QuartzCore/QuartzCore.h>
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
    __block NSUInteger callbacks = 0;
    id token = [[NSNotificationCenter defaultCenter] addObserverForName:JSBundleTimingDidLoadNotification
        object:nil queue:nil usingBlock:^(__unused NSNotification *notification) {
      callbacks++;
      NSCAssert([JSBundleTimingObserver.jsBundleLoadTime isEqual:@25], @"Snapshot is ready before callback");
    }];
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTInstanceDidLoadBundle" object:nil];
    NSCAssert(callbacks == 0, @"Wait for the logger-bearing notification on supported RN");
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTJavaScriptDidLoadNotification" object:nil userInfo:@{@"bridge": bridge}];
    NSCAssert(callbacks == 1, @"Timing-ready callback delivered");
    [[NSNotificationCenter defaultCenter] removeObserver:token];
    NSCAssert([JSBundleTimingObserver.jsBundleLoadTime isEqual:@25], @"Download duration");
    NSCAssert([JSBundleTimingObserver.jsBundleEvaluationTime isEqual:@9], @"Execution duration");
    NSCAssert([JSBundleTimingObserver.timeline[0][@"tag"] isEqual:@"RCTPLScriptDownload"], @"Timeline order");

    logger.values = @[@100, @200, @150, @250];
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTJavaScriptDidLoadNotification" object:nil userInfo:@{@"bridge": bridge}];
    NSCAssert([JSBundleTimingObserver.jsBundleLoadTime isEqual:@100] && [JSBundleTimingObserver.jsBundleEvaluationTime isEqual:@100], @"Tag durations remain independent");
    logger.values = @[@100, @100, @100, @100];
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTJavaScriptDidLoadNotification" object:nil userInfo:@{@"bridge": bridge}];
    NSCAssert([JSBundleTimingObserver.jsBundleLoadTime isEqual:@0] && [JSBundleTimingObserver.jsBundleEvaluationTime isEqual:@0], @"Zero tag duration is valid");
    logger.values = @[@100, @0, @100, @90];
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTJavaScriptDidLoadNotification" object:nil userInfo:@{@"bridge": bridge}];
    NSCAssert(JSBundleTimingObserver.jsBundleLoadTime == nil && JSBundleTimingObserver.jsBundleEvaluationTime == nil, @"Incomplete tags are unavailable");
    NSCAssert(JSBundleTimingObserver.timeline.count == 0, @"Only completed intervals are included");
    logger.values = @[];
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTJavaScriptDidLoadNotification" object:nil userInfo:@{@"bridge": bridge}];
    [JSBundleTimingObserver reset];
    NSCAssert(JSBundleTimingObserver.timeline.count == 0, @"Reset clears the session");
    bridge.performanceLogger = nil;
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTJavaScriptDidLoadNotification" object:nil userInfo:@{@"bridge": bridge}];
    NSCAssert(JSBundleTimingObserver.jsBundleLoadTime == nil, @"Missing logger is unavailable");
    bridge.performanceLogger = logger;
    logger.values = @[@100, @125, @200, @209];
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTJavaScriptDidLoadNotification" object:nil userInfo:@{@"bridge": bridge}];
    [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTJavaScriptDidFailToLoadNotification" object:nil];
    NSCAssert(JSBundleTimingObserver.jsBundleLoadTime == nil && JSBundleTimingObserver.timeline.count == 0, @"Failure clears the snapshot");
    NSLog(@"PASS: callback boundary, missing logger/tags, tag endpoints, proxy capture, reset, failure");
    return 0;
  }
}
EOF

for optimization in -O0 -O2; do
  xcrun clang "$optimization" -fobjc-arc -fmodules -fmodules-cache-path="$test_dir/cache" \
    -I "$test_dir" -I "$package_dir/ios" \
    -framework Foundation -framework QuartzCore \
    "$package_dir/ios/JSBundleTimingObserver.m" \
    "$test_dir/main.m" -o "$test_dir/test"
  "$test_dir/test"
done
