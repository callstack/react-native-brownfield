#import "ChildrenView.h"
#import "ReactNativeBrownfield.h"

@implementation ChildrenView

- (void)reactSetFrame:(CGRect)frame {
    [super reactSetFrame: frame];
    
    UIView* nativeView = [[ReactNativeBrownfield shared] getRegisteredView:_uuid];

    [self addSubview:nativeView];

    [nativeView setFrame:CGRectMake(0, 0, self.bounds.size.width, self.bounds.size.height)];
}

@end

