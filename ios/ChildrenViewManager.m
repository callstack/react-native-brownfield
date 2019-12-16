#import "ChildrenViewManager.h"
#import "ChildrenView.h"

@implementation ChildrenViewManager

RCT_EXPORT_MODULE(ChildrenView)

RCT_EXPORT_VIEW_PROPERTY(uuid, NSString*)

- (UIView *)view
{
  return [ChildrenView new];
}

@end
