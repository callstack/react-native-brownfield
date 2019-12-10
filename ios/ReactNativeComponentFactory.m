#import "ReactNativeComponentFactory.h"
#import "ReactNativeBrownfield.h"
#import <React/RCTBridge.h>

@implementation ReactNativeComponentFactory

+(ReactNativeComponent *)create:(ComponentTypes)type withInitialProperties:(NSDictionary*)initialProperties {
    switch (type) {
        case RedSquareReactComponent:
            return [ReactNativeComponentFactory instantiateReactNativeComponent:@"RedSquare" withInitialProperties:initialProperties];
        case GreenSquareReactComponent:
            return  [ReactNativeComponentFactory instantiateReactNativeComponent:@"GreenSquare" withInitialProperties:initialProperties];
    }
}

+(ReactNativeComponent *)instantiateReactNativeComponent:(NSString*)name withInitialProperties:(NSDictionary*)initialProperties {
    RCTBridge *bridge = [[ReactNativeBrownfield shared] bridge];
    if (bridge == nil) {
        NSLog(@"Error: You need to start React Native in order to use ReactNativeViewController, make sure to run [[BridgeManager shared] startReactNative] before instantiating it.");
        return nil;
    }

    return [[ReactNativeComponent alloc] initWithBridge:bridge moduleName:name initialProperties:initialProperties];
}

@end
