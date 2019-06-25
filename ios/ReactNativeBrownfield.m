#import "ReactNativeBrownfield.h"
#import "RNBrownfieldNotifications.h"

@implementation ReactNativeBrownfield

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(setPopGestureRecognizer:(BOOL)enabled) {
    NSDictionary *userInfo = [NSDictionary dictionaryWithObject:@(enabled) forKey:@"enabled"];
    
    [[NSNotificationCenter defaultCenter]
        postNotificationName:TogglePopGestureRecognizerNotification
        object:nil userInfo:userInfo];
}

RCT_EXPORT_METHOD(popToNative:(BOOL)animated) {
    NSDictionary *userInfo = [NSDictionary dictionaryWithObject:@(animated) forKey:@"animated"];
    
    [[NSNotificationCenter defaultCenter]
     postNotificationName:PopToNativeNotification
     object:nil userInfo:userInfo];
}

@end
