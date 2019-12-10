#import <UIKit/UIKit.h>
#import "ReactNativeComponent.h"

@interface UIComponent : UIView

@property (nonatomic) ReactNativeComponent *reactComponent;

-(void)addReactSubview;
-(NSDictionary*)getProps;

@end

