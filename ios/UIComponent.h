#import <UIKit/UIKit.h>
#import "ReactNativeComponent.h"

@interface UIComponent : UIView

@property (nonatomic) ReactNativeComponent *reactComponent;
@property (nonatomic) BOOL hasChildren;

-(void)initializeReactSubview:(UIView *)view;
-(void)addReactSubview;
-(NSDictionary*)getProps;

@end

