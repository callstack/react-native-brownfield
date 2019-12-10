#import "ReactNativeComponent.h"

typedef enum ouputTypes {
    RedSquareReactComponent,
    GreenSquareReactComponent
} ComponentTypes;

@interface ReactNativeComponentFactory : NSObject

+(ReactNativeComponent *)create:(ComponentTypes)type withInitialProperties:(NSDictionary*)initialProperties;

@end
