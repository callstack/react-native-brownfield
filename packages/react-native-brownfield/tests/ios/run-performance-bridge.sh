#!/usr/bin/env bash
# Compile the production dispatcher against minimal RN declarations on macOS.
set -euo pipefail
package_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/brownfield-performance-bridge.XXXXXX")"
trap 'rm -rf "$test_dir"' EXIT
mkdir -p "$test_dir/React"
cat > "$test_dir/React/RCTBridge.h" <<'STUB'
#import <Foundation/Foundation.h>
extern dispatch_queue_t RCTJSThread;
@interface RCTBridge : NSObject
- (void)dispatchBlock:(dispatch_block_t)block queue:(dispatch_queue_t)queue;
@end
STUB
cat > "$test_dir/React/RCTBridge+Private.h" <<'STUB'
#import "RCTBridge.h"
STUB
cat > "$test_dir/React/RCTBridgeModule.h" <<'STUB'
@protocol RCTBridgeModule <NSObject>
@end
#define RCT_EXPORT_MODULE()
#define RCT_EXPORT_METHOD(method) - (void)method
STUB
cat > "$test_dir/React/RCTConstants.h" <<'STUB'
#define RCTJavaScriptDidLoadNotification @"RCTJavaScriptDidLoadNotification"
#define RCTJavaScriptDidFailToLoadNotification @"RCTJavaScriptDidFailToLoadNotification"
STUB
cat > "$test_dir/main.mm" <<'TEST'
#import <Foundation/Foundation.h>
#import "React/RCTBridge.h"
#import "BrownfieldPerformanceBridge.h"

dispatch_queue_t RCTJSThread = nullptr;
@implementation RCTBridge
- (void)dispatchBlock:(dispatch_block_t)block queue:(dispatch_queue_t)queue { block(); }
@end

// RN's bridge proxy can return NO from respondsToSelector: despite implementing dispatch.
@interface TestBridgeProxy : NSProxy
@end
@implementation TestBridgeProxy
- (BOOL)respondsToSelector:(SEL)selector { return NO; }
- (void)dispatchBlock:(dispatch_block_t)block queue:(dispatch_queue_t)queue { block(); }
@end

@interface JSWorker : NSObject
- (void)run;
- (void)loaded;
@end
@implementation JSWorker
- (void)run {
  @autoreleasepool {
    // Keep a source on the run loop, as RCTJSThreadManager does.
    NSRunLoop *loop = NSRunLoop.currentRunLoop;
    [loop addPort:[NSMachPort port] forMode:NSDefaultRunLoopMode];
    while (!NSThread.currentThread.cancelled) {
      [loop runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.01]];
    }
  }
}
- (void)loaded {
  [[NSNotificationCenter defaultCenter] postNotificationName:@"RCTInstanceDidLoadBundle" object:nil];
}
@end

static void drain(void) {
  [NSRunLoop.mainRunLoop runUntilDate:[NSDate dateWithTimeIntervalSinceNow:0.03]];
}
static void post(NSString *name) {
  [[NSNotificationCenter defaultCenter] postNotificationName:name object:nil];
}
#ifndef BROWNFIELD_SIMULATOR_TEST
int main(void) {
  @autoreleasepool {
    __block NSUInteger ready = 0;
    auto center = NSNotificationCenter.defaultCenter;
    id observer = [center addObserverForName:@"BrownfieldPerformanceBridgeReady" object:nil queue:nil
        usingBlock:^(__unused NSNotification *note) {
      NSCAssert(NSThread.isMainThread, @"Readiness is delivered on main");
      ready++;
    }];
    NSCAssert(![BrownfieldPerformanceBridge dispatchToJavaScript:^{}], @"No runtime yet");
    // Never mistake an unexpected main-thread notification for a JS thread.
    post(@"RCTInstanceDidLoadBundle");
    drain();
    NSCAssert(ready == 0, @"Main is not the JS thread");
    JSWorker *worker = [JSWorker new];
    NSThread *jsThread = [[NSThread alloc] initWithTarget:worker selector:@selector(run) object:nil];
    [jsThread start];
    [worker performSelector:@selector(loaded) onThread:jsThread withObject:nil waitUntilDone:YES];
    drain();
    NSCAssert(ready == 1, @"RN 0.86 payloadless notification attaches the sampler");
    dispatch_semaphore_t ran = dispatch_semaphore_create(0);
    __block NSThread *executedOn;
    NSCAssert([BrownfieldPerformanceBridge dispatchToJavaScript:^{
      executedOn = NSThread.currentThread;
      dispatch_semaphore_signal(ran);
    }], @"Dispatch succeeds without a bridge");
    NSCAssert(dispatch_semaphore_wait(ran, dispatch_time(DISPATCH_TIME_NOW, NSEC_PER_SEC)) == 0,
              @"The JS run loop executes the sampling block");
    NSCAssert(executedOn == jsThread, @"Sampling actually runs on the JS thread");
    TestBridgeProxy *bridge = [TestBridgeProxy alloc];
    [center postNotificationName:@"RCTJavaScriptDidLoadNotification" object:nil userInfo:@{@"bridge": bridge}];
    NSCAssert(ready == 1, @"RN 0.87's second notification must not cancel the session");
    post(@"BrownfieldPerformanceStop");
    NSCAssert(![BrownfieldPerformanceBridge dispatchToJavaScript:^{}], @"Stop clears both routes");
    // A notification queued before stop must not resurrect the old runtime.
    [worker performSelector:@selector(loaded) onThread:jsThread withObject:nil waitUntilDone:YES];
    post(@"BrownfieldPerformanceStop");
    drain();
    NSCAssert(ready == 1 && ![BrownfieldPerformanceBridge dispatchToJavaScript:^{}], @"Pending readiness cancelled");
    [worker performSelector:@selector(loaded) onThread:jsThread withObject:nil waitUntilDone:YES];
    drain();
    NSCAssert(ready == 2, @"A later runtime can attach after stop");
    post(@"RCTJavaScriptDidFailToLoadNotification");
    NSCAssert(![BrownfieldPerformanceBridge dispatchToJavaScript:^{}], @"Failure clears the JS thread");
    // Preserve the original bridge/proxy route for legacy RN.
    [center postNotificationName:@"RCTJavaScriptDidLoadNotification" object:nil userInfo:@{@"bridge": bridge}];
    __block BOOL called = NO;
    NSCAssert([BrownfieldPerformanceBridge dispatchToJavaScript:^{ called = YES; }] && called,
              @"Bridge proxy fallback still works");
    NSCAssert(ready == 3, @"Legacy bridge announces readiness");
    post(@"BrownfieldPerformanceStop");
    [jsThread cancel];
    [center removeObserver:observer];
    NSLog(@"PASS: RN 0.86 JS dispatch, duplicate notification, stop/restart, pending stop, failure, proxy fallback");
  }
}
#endif
TEST
if [[ "${1:-}" == "--simulator" ]]; then
  sdk="$(xcrun --sdk iphonesimulator --show-sdk-path)"
  target="$(uname -m)-apple-ios15.1-simulator"
  for optimization in -Onone -O; do
    xcrun --sdk iphonesimulator clang++ -std=c++17 -fobjc-arc -fmodules -isysroot "$sdk" -target "$target" \
      -fmodules-cache-path="$test_dir/cache" -I "$test_dir" -I "$package_dir/ios" \
      -c "$package_dir/ios/BrownfieldPerformanceBridge.mm" -o "$test_dir/bridge.o"
    xcrun --sdk iphonesimulator clang++ -std=c++17 -fobjc-arc -fmodules -isysroot "$sdk" -target "$target" \
      -fmodules-cache-path="$test_dir/cache" -I "$test_dir" -I "$package_dir/ios" \
      -DBROWNFIELD_SIMULATOR_TEST -c "$test_dir/main.mm" -o "$test_dir/stubs.o"
    xcrun --sdk iphonesimulator swiftc "$optimization" -sdk "$sdk" -target "$target" \
      -module-cache-path "$test_dir/cache" -import-objc-header "$package_dir/ios/BrownfieldPerformanceBridge.h" \
      "$package_dir/ios/BrownfieldDisplayMetrics.swift" "$package_dir/tests/ios/performance-bridge.swift" \
      "$test_dir/bridge.o" "$test_dir/stubs.o" -lc++ -o "$test_dir/test"
    xcrun simctl spawn booted "$test_dir/test"
  done
  exit 0
fi
for optimization in -O0 -O2; do
  xcrun clang++ "$optimization" -std=c++17 -fobjc-arc -fmodules \
    -fmodules-cache-path="$test_dir/cache" -I "$test_dir" -I "$package_dir/ios" \
    -framework Foundation "$package_dir/ios/BrownfieldPerformanceBridge.mm" \
    "$test_dir/main.mm" -o "$test_dir/test"
  "$test_dir/test"
done
