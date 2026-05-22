#import "BrownfieldDevLoadingViewBridge.h"

#import <React/RCTDevLoadingViewSetEnabled.h>

@implementation BrownfieldDevLoadingViewBridge

+ (void)setEnabled:(BOOL)enabled
{
  RCTDevLoadingViewSetEnabled(enabled);
}

@end
