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

// React Native calls invalidate on modules during teardown (_invalidateModules):
// https://github.com/facebook/react-native/blob/4bc2473f5d0233ea5384c1ef24f6a55615de2220/packages/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModuleManager.mm#L944-L985
// Clearing the callback sends later messages down the not-ready drop path.
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
  // The singleton and the callback are read and written under one lock.
  // postMessage delivers on the main queue, while getTurboModule: (below) installs the
  // callback when JS first requires the module. React Native calls getTurboModule: from
  // https://github.com/facebook/react-native/blob/4bc2473f5d0233ea5384c1ef24f6a55615de2220/packages/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModuleManager.mm#L336-L345
  // and the JS require path is
  // https://github.com/facebook/react-native/blob/4bc2473f5d0233ea5384c1ef24f6a55615de2220/packages/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModuleManager.mm#L845-L860.
  @synchronized (ReactNativeBrownfieldModule.class) {
    if (!_sharedInstance) {
      NSLog(@"ReactNativeBrownfieldModule is not initialized, dropping message");
      return;
    }

    // The codegen base class declares the callback as a @protected ivar:
    // https://github.com/facebook/react-native/blob/4bc2473f5d0233ea5384c1ef24f6a55615de2220/packages/react-native-codegen/src/generators/modules/GenerateModuleObjCpp/index.js#L44
    // Calling an empty std::function throws std::bad_function_call:
    // https://en.cppreference.com/w/cpp/utility/functional/function/operator%28%29.html
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
  // Building the spec installs _eventEmitterCallback. The spec constructor calls setEventEmitterCallback
  // (https://github.com/facebook/react-native/blob/4bc2473f5d0233ea5384c1ef24f6a55615de2220/packages/react-native-codegen/src/generators/modules/GenerateModuleObjCpp/source/serializeModule.js#L88),
  // ObjCTurboModule forwards it (https://github.com/facebook/react-native/blob/4bc2473f5d0233ea5384c1ef24f6a55615de2220/packages/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm#L924-L931),
  // and the generated setter assigns the ivar (https://github.com/facebook/react-native/blob/4bc2473f5d0233ea5384c1ef24f6a55615de2220/packages/react-native-codegen/src/generators/modules/GenerateModuleObjCpp/source/serializeModule.js#L44).
  // Hold the same lock as emitMessageFromNative: so the write and the read do not race.
  @synchronized (ReactNativeBrownfieldModule.class) {
    return std::make_shared<facebook::react::NativeReactNativeBrownfieldModuleSpecJSI>(params);
  }
}

@end
