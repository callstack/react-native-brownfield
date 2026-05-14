#import "NativeBrownfieldNavigation.h"

#if __has_include("BrownfieldNavigation/BrownfieldNavigation-Swift.h")
#import "BrownfieldNavigation/BrownfieldNavigation-Swift.h"
#else
#import "BrownfieldNavigation-Swift.h"
#endif

@implementation NativeBrownfieldNavigation

- (void)navigateToSettings {
    [[[BrownfieldNavigationManager shared] getDelegate] navigateToSettings];
}

- (void)navigateToReferrals:(NSString *)userId {
    [[[BrownfieldNavigationManager shared] getDelegate] navigateToReferrals:userId];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeBrownfieldNavigationSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"NativeBrownfieldNavigation";
}

@end
