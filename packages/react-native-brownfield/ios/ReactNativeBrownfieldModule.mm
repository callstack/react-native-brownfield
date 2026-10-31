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

  if (_sharedInstance == self) {
    _sharedInstance = nil;
  }
}

- (void)handleNativeToJSMessage:(NSNotification *)notification {
  NSString *message = notification.userInfo[@"message"];
  if (message) {
    [ReactNativeBrownfieldModule emitMessageFromNative:message];
  }
}

+ (void)emitMessageFromNative:(NSString *)message {
  if (!_sharedInstance) {
    NSLog(@"ReactNativeBrownfieldModule is not initialized, dropping message");
    return;
  }

  // The event emitter callback is only set once JS has first required the
  // module and getTurboModule: has built its JSI spec. The codegen base class
  // declares it:
  // https://github.com/facebook/react-native/blob/4bc2473f5d0233ea5384c1ef24f6a55615de2220/packages/react-native-codegen/src/generators/modules/GenerateModuleObjCpp/index.js#L44
  // and the generated constructor sets it:
  // https://github.com/facebook/react-native/blob/4bc2473f5d0233ea5384c1ef24f6a55615de2220/packages/react-native-codegen/src/generators/modules/GenerateModuleObjCpp/source/serializeModule.js#L88
  // Calling an empty std::function throws std::bad_function_call:
  // https://en.cppreference.com/w/cpp/utility/functional/function/operator%28%29.html
  if (!_sharedInstance->_eventEmitterCallback) {
    NSLog(@"ReactNativeBrownfieldModule is not ready for JS yet, dropping message");
    return;
  }

  [_sharedInstance emitOnBrownfieldMessage:@{ @"text": message }];
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
