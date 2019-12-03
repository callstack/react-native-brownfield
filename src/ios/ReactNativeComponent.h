#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>

NS_ASSUME_NONNULL_BEGIN

@interface ReactNativeComponent : RCTRootView

-(void)attachToSuperview:(UIView *)parent;

@end

NS_ASSUME_NONNULL_END
