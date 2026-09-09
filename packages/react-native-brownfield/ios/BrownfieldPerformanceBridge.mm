#import "BrownfieldPerformanceBridge.h"
#import <React/RCTBridge.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTConstants.h>
#import <objc/runtime.h>

static __weak RCTBridge *sPerformanceBridge;

@implementation BrownfieldPerformanceBridge
+ (BOOL)dispatchToJavaScript:(dispatch_block_t)block
{
  RCTBridge *bridge = sPerformanceBridge;
  // NSProxy's respondsToSelector: does not reliably describe RCTBridgeProxy.
  if (!bridge || !class_getInstanceMethod(object_getClass(bridge), @selector(dispatchBlock:queue:))) {
    return NO;
  }
  [bridge dispatchBlock:block queue:RCTJSThread];
  return YES;
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
  [[NSNotificationCenter defaultCenter] addObserverForName:RCTJavaScriptDidLoadNotification
      object:nil queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *notification) {
    sPerformanceBridge = notification.userInfo[@"bridge"];
    [[NSNotificationCenter defaultCenter] postNotificationName:@"BrownfieldPerformanceBridgeReady" object:nil];
  }];
  [[NSNotificationCenter defaultCenter] addObserverForName:@"BrownfieldPerformanceStop"
      object:nil queue:NSOperationQueue.mainQueue usingBlock:^(__unused NSNotification *notification) {
    sPerformanceBridge = nil;
  }];
  [[NSNotificationCenter defaultCenter] addObserverForName:RCTJavaScriptDidFailToLoadNotification
      object:nil queue:NSOperationQueue.mainQueue usingBlock:^(__unused NSNotification *notification) {
    sPerformanceBridge = nil;
  }];
}
