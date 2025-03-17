#import "ReactNativeBrownfieldModule.h"
#import "ReactNativeBrownfield-Swift.h"

@implementation ReactNativeBrownfieldModule

RCT_EXPORT_MODULE(ReactNativeBrownfield);

RCT_EXPORT_METHOD(setPopGestureRecognizerEnabled:(BOOL)enabled) {
  [ReactNativeBrownfieldModuleImpl setPopGestureRecognizerEnabled:enabled];
}

RCT_EXPORT_METHOD(popToNative:(BOOL)animated) {
  [ReactNativeBrownfieldModuleImpl popToNativeWithAnimated:animated];
}

@end
