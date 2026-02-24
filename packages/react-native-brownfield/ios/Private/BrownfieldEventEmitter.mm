#import "BrownfieldEventEmitter.h"

@implementation BrownfieldEventEmitter

RCT_EXPORT_MODULE(BrownfieldEventEmitter)

static BrownfieldEventEmitter *sharedEmitter = nil;

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (instancetype)init {
  self = [super initWithDisabledObservation];
  if (self) {
    sharedEmitter = self;
  }
  return self;
}

+ (void)emitMessage:(NSString *)message {
  if (sharedEmitter) {
    [sharedEmitter sendEventWithName:@"brownfieldMessage" body:message];
  }
}

- (NSArray<NSString *> *)supportedEvents {
  return @[@"brownfieldMessage"];
}

RCT_EXPORT_METHOD(addListener:(NSString *)eventName) {}
RCT_EXPORT_METHOD(removeListeners:(double)count) {}

@end
