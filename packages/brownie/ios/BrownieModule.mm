#import "BrownieModule.h"
#import <jsi/jsi.h>

#if __has_include("Brownie/Brownie-Swift.h")
#import "Brownie/Brownie-Swift.h"
#else
#import "Brownie-Swift.h"
#endif

#import "BrownieInstaller.h"

using namespace facebook;

@interface BrownieModule (JSIBindings) <RCTTurboModuleWithJSIBindings>
@end

@implementation BrownieModule {
  NSMutableDictionary<NSString *, NSObject *> *_notificationObservers;
}

RCT_EXPORT_MODULE(Brownie);

- (instancetype)init {
  self = [super init];
  if (self) {
    _notificationObservers = [NSMutableDictionary new];
    [[NSNotificationCenter defaultCenter]
        addObserver:self
           selector:@selector(handleNotification:)
               name:@"BrownieStoreUpdated"
             object:nil];
  }
  return self;
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)handleNotification:(NSNotification *)notification {
  NSDictionary *userInfo = notification.userInfo ?: @{};
  [self emitNativeStoreDidChange:userInfo];
}

- (void)installJSIBindingsWithRuntime:(facebook::jsi::Runtime &)runtime
                          callInvoker:(const std::shared_ptr<facebook::react::CallInvoker> &)callinvoker {
  brownie::BrownieInstaller::install(runtime);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeBrownieModuleSpecJSI>(params);
}

@end
