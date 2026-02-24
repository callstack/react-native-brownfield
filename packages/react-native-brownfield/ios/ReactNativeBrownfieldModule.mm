#import "ReactNativeBrownfieldModule.h"

#if __has_include("ReactBrownfield/ReactBrownfield-Swift.h")
#import "ReactBrownfield/ReactBrownfield-Swift.h"
#else
#import "ReactBrownfield-Swift.h"
#endif

@implementation ReactNativeBrownfieldModule

RCT_EXPORT_MODULE(ReactNativeBrownfield);

static ReactNativeBrownfieldModule *_sharedInstance = nil;

- (instancetype)init {
  self = [super init];
  if (self) {
    _sharedInstance = self;

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleNativeToJSMessage:)
                                                 name:@"BrownfieldMessageToJSNotification"
                                               object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)handleNativeToJSMessage:(NSNotification *)notification {
  NSString *message = notification.userInfo[@"message"];
  if (message) {
    [ReactNativeBrownfieldModule emitMessageFromNative:message];
  }
}

+ (void)emitMessageFromNative:(NSString *)message {
  if (_sharedInstance) {
    [_sharedInstance emitOnBrownfieldMessage:@{ @"text": message }];
  } else {
    NSLog(@"ReactNativeBrownfieldModule is not initialized, dropping message");
  }
}

RCT_EXPORT_METHOD(setPopGestureRecognizerEnabled:(BOOL)enabled) {
  [ReactNativeBrownfieldModuleImpl setPopGestureRecognizerEnabled:enabled];
}

RCT_EXPORT_METHOD(popToNative:(BOOL)animated) {
  [ReactNativeBrownfieldModuleImpl popToNativeWithAnimated:animated];
}

RCT_EXPORT_METHOD(postMessage:(NSString *)message) {
  [ReactNativeBrownfieldModuleImpl postMessage:message];
}

RCT_EXPORT_METHOD(addListener:(NSString *)eventName) {}

RCT_EXPORT_METHOD(removeListeners:(double)count) {}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeReactNativeBrownfieldModuleSpecJSI>(params);
}

@end
