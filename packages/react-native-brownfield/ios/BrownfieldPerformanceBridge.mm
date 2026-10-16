#import "BrownfieldPerformanceBridge.h"
#import <React/RCTBridge.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTConstants.h>
#import <objc/runtime.h>
#include <atomic>

// Accessed on main, like BrownfieldDisplaySession.
static __weak RCTBridge *sPerformanceBridge;
static __weak NSThread *sJavaScriptThread;
static std::atomic<uint64_t> sGeneration{0};

static void BrownfieldPerformanceReset(void)
{
  ++sGeneration;
  sPerformanceBridge = nil;
  sJavaScriptThread = nil;
}

@implementation BrownfieldPerformanceBridge
+ (BOOL)dispatchToJavaScript:(dispatch_block_t)block
{
  NSThread *thread = sJavaScriptThread;
  if (thread && !thread.finished && !thread.cancelled) {
    [self performSelector:@selector(runJavaScriptBlock:)
                 onThread:thread
               withObject:[block copy]
            waitUntilDone:NO
                    modes:@[NSRunLoopCommonModes]];
    return YES;
  }

  RCTBridge *bridge = sPerformanceBridge;
  // NSProxy's respondsToSelector: does not reliably describe RCTBridgeProxy.
  if (!bridge || !class_getInstanceMethod(object_getClass(bridge), @selector(dispatchBlock:queue:))) {
    return NO;
  }
  [bridge dispatchBlock:block queue:RCTJSThread];
  return YES;
}

+ (void)runJavaScriptBlock:(dispatch_block_t)block
{
  block();
}
@end

// A separate iOS-only module leaves Android's generated module contract unchanged.
@interface BrownfieldPerformance : NSObject <RCTBridgeModule>
@end
@implementation BrownfieldPerformance
RCT_EXPORT_MODULE();
+ (BOOL)requiresMainQueueSetup { return NO; }
RCT_EXPORT_METHOD(markFullyDisplayed:(NSString *)presentationID)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [[NSNotificationCenter defaultCenter] postNotificationName:@"BrownfieldMarkFullyDisplayed"
                                                      object:presentationID];
  });
}
@end

__attribute__((constructor)) static void BrownfieldPerformanceRegister(void)
{
  // Bridgeless RN (including 0.86) posts synchronously from loadScript's afterLoad
  // callback on the JS thread. Observe without a queue so we capture that thread,
  // whose run loop is maintained by RCTJSThreadManager. currentBridge is a stub
  // when the legacy architecture is removed, and this notification has no payload.
  [[NSNotificationCenter defaultCenter] addObserverForName:@"RCTInstanceDidLoadBundle"
      object:nil queue:nil usingBlock:^(__unused NSNotification *notification) {
    const auto generation = sGeneration.load();
    NSThread *thread = NSThread.currentThread;
    if (thread.isMainThread) {
      return;
    }
    dispatch_async(dispatch_get_main_queue(), ^{
      if (generation != sGeneration.load()) {
        return;
      }
      sJavaScriptThread = thread;
      sPerformanceBridge = nil;
      [[NSNotificationCenter defaultCenter] postNotificationName:@"BrownfieldPerformanceBridgeReady" object:nil];
    });
  }];
  [[NSNotificationCenter defaultCenter] addObserverForName:RCTJavaScriptDidLoadNotification
      object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *notification) {
    sPerformanceBridge = notification.userInfo[@"bridge"];
    // Newer RN also sends this notification after the instance notification.
    // Announcing readiness twice would cancel an already attached display session.
    if (!sJavaScriptThread) {
      [[NSNotificationCenter defaultCenter] postNotificationName:@"BrownfieldPerformanceBridgeReady" object:nil];
    }
  }];
  [[NSNotificationCenter defaultCenter] addObserverForName:@"BrownfieldPerformanceStop"
      object:nil queue:NSOperationQueue.mainQueue usingBlock:^(__unused NSNotification *notification) {
    BrownfieldPerformanceReset();
  }];
  [[NSNotificationCenter defaultCenter] addObserverForName:RCTJavaScriptDidFailToLoadNotification
      object:nil queue:NSOperationQueue.mainQueue usingBlock:^(__unused NSNotification *notification) {
    BrownfieldPerformanceReset();
  }];
}
