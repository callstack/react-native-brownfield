#import "BrownieModule.h"
#import <jsi/jsi.h>
#import <ReactCommon/TurboModuleWithJSIBindings.h>

#if __has_include("Brownie/Brownie-Swift.h")
#import "Brownie/Brownie-Swift.h"
#else
#import "Brownie-Swift.h"
#endif

#import "BrownieInstaller.h"

using namespace facebook;

namespace facebook::react {

/**
 * ObjC codegen TurboModules do not inherit TurboModuleWithJSIBindings in C++.
 * Bridgeless mode only installs JSI globals via this hook when the module is first required from JS.
 */
class BrownieTurboModule : public NativeBrownieModuleSpecJSI,
                           public TurboModuleWithJSIBindings {
 public:
  explicit BrownieTurboModule(const ObjCTurboModule::InitParams &params)
      : NativeBrownieModuleSpecJSI(params) {}

 private:
  void installJSIBindingsWithRuntime(jsi::Runtime &runtime) override {
    brownie::BrownieInstaller::install(runtime);
  }
};

} // namespace facebook::react

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

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::BrownieTurboModule>(params);
}

@end
