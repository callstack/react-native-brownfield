#import "JSBundleTimingObserver.h"

#import <React/RCTBridge.h>
#import <React/RCTConstants.h>
#import <React/RCTPerformanceLogger.h>
#import <React/RCTPLTag.h>
#import <objc/runtime.h>

static NSNumber *sJSBundleLoadTime;
static NSNumber *sJSBundleEvaluationTime;
static NSArray *sTimeline;

static NSString *const kRCTInstanceDidLoadBundleNotification = @"RCTInstanceDidLoadBundle";

NSNotificationName const JSBundleTimingDidLoadNotification = @"BrownfieldJSBundleTimingDidLoad";

// Check the endpoints: a completed interval can round to zero milliseconds,
// while an unfinished interval can produce a negative durationForTag: value.
static NSNumber *JSBundleTimingNumberOrNil(NSArray<NSNumber *> *values, RCTPLTag tag)
{
  NSUInteger index = (NSUInteger)tag * 2;
  if (values.count <= index + 1) {
    return nil;
  }
  int64_t start = values[index].longLongValue;
  int64_t stop = values[index + 1].longLongValue;
  return start > 0 && stop >= start ? @(stop - start) : nil;
}

static void JSBundleTimingClearTagSnapshot(void)
{
  sJSBundleLoadTime = nil;
  sJSBundleEvaluationTime = nil;
  sTimeline = @[];
}

@implementation JSBundleTimingObserver

+ (NSNumber *)jsBundleLoadTime
{
  return sJSBundleLoadTime;
}

+ (NSNumber *)jsBundleEvaluationTime
{
  return sJSBundleEvaluationTime;
}

+ (NSArray *)timeline { return sTimeline ?: @[]; }

+ (void)reset
{
  if ([NSThread isMainThread]) {
    JSBundleTimingClearTagSnapshot();
  } else {
    dispatch_async(dispatch_get_main_queue(), ^{
      [self reset];
    });
  }
}

+ (RCTPerformanceLogger *)performanceLoggerFromNotification:(NSNotification *)notification
{
  id bridge = notification.userInfo[@"bridge"];
  RCTPerformanceLogger *logger = nil;

  // RCTBridgeProxy inherits NSProxy's forwarding-based respondsToSelector:.
  // It can report NO even for its synthesized performanceLogger getter. Inspect
  // the actual class method table so we can safely call an implemented getter.
  Class bridgeClass = object_getClass(bridge);
  BOOL hasLoggerGetter = class_getInstanceMethod(bridgeClass, @selector(performanceLogger)) != NULL;
  if (hasLoggerGetter) {
    logger = [bridge performanceLogger];
  }

  return logger;
}

+ (void)captureTimingsFromNotification:(NSNotification *)notification
{
  RCTPerformanceLogger *logger = [self performanceLoggerFromNotification:notification];
  if (logger == nil) {
    JSBundleTimingClearTagSnapshot();
    return;
  }

  NSArray<NSNumber *> *values = [logger valuesForTags];
  sJSBundleLoadTime = JSBundleTimingNumberOrNil(values, RCTPLScriptDownload);
  sJSBundleEvaluationTime = JSBundleTimingNumberOrNil(values, RCTPLScriptExecution);
  // These intervals can overlap. Preserve endpoints instead of adding durations.
  RCTPLTag tags[] = {RCTPLScriptDownload, RCTPLScriptExecution};
  NSArray *names = @[@"RCTPLScriptDownload", @"RCTPLScriptExecution"];
  NSMutableArray *timeline = [NSMutableArray new];
  for (NSUInteger i = 0; i < 2; i++) {
    NSUInteger index = (NSUInteger)tags[i] * 2;
    if (JSBundleTimingNumberOrNil(values, tags[i]) != nil) {
      [timeline addObject:@{@"tag": names[i], @"startMs": values[index], @"stopMs": values[index + 1]}];
    }
  }
  sTimeline = [timeline sortedArrayUsingDescriptors:@[[NSSortDescriptor sortDescriptorWithKey:@"startMs" ascending:YES]]];
}

@end

__attribute__((constructor)) static void JSBundleTimingObserverRegister(void)
{
  NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
  NSOperationQueue *mainQueue = [NSOperationQueue mainQueue];

  [center addObserverForName:RCTJavaScriptDidLoadNotification
                      object:nil
                       queue:mainQueue
                  usingBlock:^(NSNotification *notification) {
                    [JSBundleTimingObserver captureTimingsFromNotification:notification];
                    [[NSNotificationCenter defaultCenter] postNotificationName:JSBundleTimingDidLoadNotification object:nil];
                  }];

  [center addObserverForName:kRCTInstanceDidLoadBundleNotification
                      object:nil
                       queue:mainQueue
                  usingBlock:^(NSNotification *notification) {
                    // RN versions that expose the instance logger on the bridge proxy
                    // send RCTJavaScriptDidLoadNotification next, with that proxy.
                    // currentBridge is a stub, and this earlier notification has no payload.
                    Class proxyClass = NSClassFromString(@"RCTBridgeProxy");
                    BOOL hasLoggerSetter = [proxyClass instancesRespondToSelector:NSSelectorFromString(@"setPerformanceLogger:")];
                    if (hasLoggerSetter) {
                      return;
                    }
                    [JSBundleTimingObserver captureTimingsFromNotification:notification];
                    [[NSNotificationCenter defaultCenter] postNotificationName:JSBundleTimingDidLoadNotification object:nil];
                  }];

  [center addObserverForName:RCTJavaScriptDidFailToLoadNotification
                      object:nil
                       queue:mainQueue
                  usingBlock:^(__unused NSNotification *notification) {
                    [JSBundleTimingObserver reset];
                  }];
}
