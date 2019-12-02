#import "ReactNativeComponent.h"

@implementation ReactNativeComponent


-(void)attachToSuperview:(UIView *)parent {
    self.bounds = parent.bounds;
    self.layer.anchorPoint = CGPointMake(0, 0);
    [parent addSubview:self];
}

@end
