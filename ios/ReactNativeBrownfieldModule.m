#import "ReactNativeBrownfieldModule.h"

#if __has_include("ReactNativeBrownfield/ReactNativeBrownfield-Swift.h")
#import "ReactNativeBrownfield/ReactNativeBrownfield-Swift.h"
#else
#import "ReactNativeBrownfield-Swift.h"
#endif

@implementation ReactNativeBrownfieldModule

RCT_EXPORT_MODULE(ReactNativeBrownfield);

RCT_EXPORT_METHOD(setPopGestureRecognizerEnabled:(BOOL)enabled) {
  [ReactNativeBrownfieldModuleImpl setPopGestureRecognizerEnabled:enabled];
}

RCT_EXPORT_METHOD(popToNative:(BOOL)animated) {
  [ReactNativeBrownfieldModuleImpl popToNativeWithAnimated:animated];
}

@end
