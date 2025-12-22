#import "BrownieModule.h"
#import <jsi/jsi.h>

#if __has_include("Brownie/Brownie-Swift.h")
#import "Brownie/Brownie-Swift.h"
#else
#import "Brownie-Swift.h"
#endif

#import "BrownieHostObject.h"
#import "BrownieStoreManager.h"
#import "RCTTurboModule.h"

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
  auto getStore = jsi::Function::createFromHostFunction(
      runtime, jsi::PropNameID::forAscii(runtime, "__getStore"), 1,
      [](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args,
         size_t count) -> jsi::Value {
        if (count < 1 || !args[0].isString()) {
          throw jsi::JSError(rt, "getStore requires a string key argument");
        }

        std::string key = args[0].asString(rt).utf8(rt);
        auto store = brownie::BrownieStoreManager::shared().getStore(key);

        if (!store) {
          return jsi::Value::undefined();
        }

        auto hostObject = std::make_shared<brownie::BrownieHostObject>(store);
        return jsi::Object::createFromHostObject(rt, hostObject);
      });

  runtime.global().setProperty(runtime, "__getStore", getStore);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeBrownieModuleSpecJSI>(params);
}

@end
