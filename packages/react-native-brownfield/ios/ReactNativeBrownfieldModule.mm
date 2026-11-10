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
    @synchronized (ReactNativeBrownfieldModule.class) {
      _sharedInstance = self;
    }

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleNativeToJSMessage:)
                                                 name:@"BrownfieldMessageToJSNotification"
                                               object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];

  @synchronized (ReactNativeBrownfieldModule.class) {
    if (_sharedInstance == self) {
      _sharedInstance = nil;
    }
  }
}

// React Native calls invalidate during teardown; clearing the callback sends
// later messages down the not-ready drop path.
- (void)invalidate {
  @synchronized (ReactNativeBrownfieldModule.class) {
    _eventEmitterCallback = nullptr;
  }
}

- (void)handleNativeToJSMessage:(NSNotification *)notification {
  NSString *message = notification.userInfo[@"message"];
  if (message) {
    [ReactNativeBrownfieldModule emitMessageFromNative:message];
  }
}

+ (void)emitMessageFromNative:(NSString *)message {
  // Keep singleton and callback access under one lock because getTurboModule:
  // installs the callback when JS first requires the module.
  @synchronized (ReactNativeBrownfieldModule.class) {
    if (!_sharedInstance) {
      NSLog(@"ReactNativeBrownfieldModule is not initialized, dropping message");
      return;
    }

    // The codegen base class exposes this callback as a protected std::function;
    // invoking it while empty would throw std::bad_function_call.
    if (!_sharedInstance->_eventEmitterCallback) {
      NSLog(@"ReactNativeBrownfieldModule is not ready for JS yet, dropping message");
      return;
    }

    [_sharedInstance emitOnBrownfieldMessage:@{ @"text": message }];
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
  // Building the spec installs _eventEmitterCallback; use the same lock as
  // emitMessageFromNative: to prevent the callback read and write from racing.
  @synchronized (ReactNativeBrownfieldModule.class) {
    return std::make_shared<facebook::react::NativeReactNativeBrownfieldModuleSpecJSI>(params);
  }
}

@end
