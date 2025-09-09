#import "ReactNativeBrownfieldModule.h"
#import <jsi/jsi.h>

#if __has_include("ReactBrownfield/ReactBrownfield-Swift.h")
#import "ReactBrownfield/ReactBrownfield-Swift.h"
#else
#import "ReactBrownfield-Swift.h"
#endif

#import "RCTImagePrimitivesConversions.h"
#import "RCTConversions.h"
#import "RCTTurboModule.h"

#define HOSTFN(name, basecount)                                                \
jsi::Function::createFromHostFunction( \
runtime, \
jsi::PropNameID::forAscii(runtime, name), \
basecount, \
[=](jsi::Runtime &runtime, const jsi::Value &thisValue, const jsi::Value *args, size_t count) -> jsi::Value

using namespace facebook;

class BrownieStoreObject : public jsi::HostObject {
private:
  NSString* storeKey;

public:
  BrownieStoreObject(NSString* key) : storeKey(key) {}
  
  jsi::Value get(jsi::Runtime& runtime, const jsi::PropNameID& propName) override;
  void set(jsi::Runtime& runtime, const jsi::PropNameID& propName, const jsi::Value& value) override;
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime& runtime) override;
};

std::vector<jsi::PropNameID> BrownieStoreObject::getPropertyNames(facebook::jsi::Runtime& runtime) {
  return jsi::PropNameID::names(runtime, "unbox");
}

jsi::Value BrownieStoreObject::get(jsi::Runtime& runtime, const jsi::PropNameID& propName) {
  std::string name = propName.utf8(runtime);
  NSString* key = storeKey;
  
  if (name == "unbox") {
    return HOSTFN("unbox", 0) {
      auto snapshot = [[StoreManager shared] snapshotWithKey:key];
      return facebook::react::TurboModuleConvertUtils::convertObjCObjectToJSIValue(runtime, snapshot);
    });
  }
  
  auto dict = [[StoreManager shared] snapshotWithKey:key];
  auto propKey = [NSString stringWithCString:name.c_str() encoding:NSUTF8StringEncoding];
  id value = [dict valueForKey:propKey];
  
  return facebook::react::TurboModuleConvertUtils::convertObjCObjectToJSIValue(runtime, value);
}

void BrownieStoreObject::set(jsi::Runtime& runtime, const jsi::PropNameID& propName, const jsi::Value& value) {
  std::string name = propName.utf8(runtime);
  auto propKey = [NSString stringWithCString:name.c_str() encoding:NSUTF8StringEncoding];
  
  id objcValue = facebook::react::TurboModuleConvertUtils::convertJSIValueToObjCObject(runtime, value, nullptr);
  [[StoreManager shared] setValueWithKey:storeKey property:propKey value:objcValue];
}

@interface ReactNativeBrownfieldModule (JSIBindings) <RCTTurboModuleWithJSIBindings>
@end

@implementation ReactNativeBrownfieldModule

RCT_EXPORT_MODULE(ReactNativeBrownfield);

- (instancetype)init
{
  self = [super init];
  if (self) {
    [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(handleNotification:)
                                                     name:@"BrownieStoreUpdated"
                                                   object:nil];
  }
  return self;
}

RCT_EXPORT_METHOD(setPopGestureRecognizerEnabled:(BOOL)enabled) {
  [ReactNativeBrownfieldModuleImpl setPopGestureRecognizerEnabled:enabled];
}

RCT_EXPORT_METHOD(popToNative:(BOOL)animated) {
  [ReactNativeBrownfieldModuleImpl popToNativeWithAnimated:animated];
}

- (void)handleNotification:(NSNotification *)notification {
  [self emitNativeStoreDidChange:@{}];
}

- (void)installJSIBindingsWithRuntime:(facebook::jsi::Runtime &)runtime callInvoker:(const std::shared_ptr<facebook::react::CallInvoker> &)callinvoker {
  
  auto getStore = HOSTFN("__getStore", 1) {
    if (count < 1 || !args[0].isString()) {
      throw jsi::JSError(runtime, "getStore requires a string key argument");
    }
    
    std::string keyStr = args[0].asString(runtime).utf8(runtime);
    NSString* key = [NSString stringWithCString:keyStr.c_str() encoding:NSUTF8StringEncoding];
    
    auto brownieStore = std::make_shared<BrownieStoreObject>(key);
    return jsi::Object::createFromHostObject(runtime, brownieStore);
  });
  
  runtime.global().setProperty(runtime, "__getStore", getStore);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeReactNativeBrownfieldModuleSpecJSI>(params);
}

@end
