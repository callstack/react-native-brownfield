#import "ReactNativeComponent.h"
#import "ReactNativeBrownfieldNotifications.h"



@implementation ReactNativeComponent

-(instancetype)initWithBridge:(RCTBridge *)bridge moduleName:(NSString *)name initialProperties:(NSDictionary *)initialProperties {
    NSArray* pressHanlders = [NSArray arrayWithObjects: @"onPress", nil];
    _handlersRegistry = [NSMutableDictionary new];
    _uuid = [[NSUUID UUID] UUIDString];
    
    NSMutableDictionary *newProps = [initialProperties mutableCopy];
    
    for (NSString* handler in pressHanlders) {
        if ([newProps objectForKey:handler] != nil) {
            _handlersRegistry[handler] = newProps[handler];
            [newProps removeObjectForKey:handler];
        }
    }
    
    [newProps setValue:_uuid forKey:@"uuid"];
    
    [[NSNotificationCenter defaultCenter]
     addObserver:self selector:@selector(handleCallback:)
     name:OnPressNotification object:nil];
    
    return [super initWithBridge:bridge moduleName:name initialProperties:newProps];
}

-(void)attachToSuperview:(UIView *)parent {
    self.bounds = parent.bounds;
    self.layer.anchorPoint = CGPointMake(0, 0);
    [parent addSubview:self];
}

- (void)handleCallback:(NSNotification*)notification {
    NSDictionary *userInfo = notification.userInfo;
    NSString *uuid = [userInfo objectForKey:@"uuid"];
    NSString *handler = [userInfo objectForKey:@"handler"];
    
    if([_uuid isEqualToString:uuid] && [_handlersRegistry objectForKey:handler] != nil) {
        void (^ callback)(void) = _handlersRegistry[handler];
        callback();
    }
}

@end
