#import "ReactNativeBrownfieldModule.h"
#import "ReactNativeBrownfieldNotifications.h"

@implementation ReactNativeBrownfieldModule

RCT_EXPORT_MODULE(ReactNativeBrownfield);

RCT_EXPORT_METHOD(setPopGestureRecognizerEnabled:(BOOL)enabled) {
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
