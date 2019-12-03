#import "ReactNativeComponent.h"

typedef enum ouputTypes {
    RedSquare,
    GreenSquare
} ComponentTypes;

@interface ReactNativeComponentFactory : NSObject

+(ReactNativeComponent *)create:(ComponentTypes)type withInitialProperties:(NSDictionary*)initialProperties;

@end
