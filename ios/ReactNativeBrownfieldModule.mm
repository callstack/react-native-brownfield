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

public:
  jsi::Value get(jsi::Runtime& runtime, const jsi::PropNameID& propName) override;
  std::vector<jsi::PropNameID> getPropertyNames(jsi::Runtime& runtime) override;
};

std::vector<jsi::PropNameID> BrownieStoreObject::getPropertyNames(facebook::jsi::Runtime& runtime) {
  return jsi::PropNameID::names(runtime, "unbox");
}

jsi::Value BrownieStoreObject::get(jsi::Runtime& runtime, const jsi::PropNameID& propName) {
  std::string name = propName.utf8(runtime);
  
  // TODO: Make this dynamic (createNew..)
  auto dict = [[StoreManager shared] snapshotWithKey:@"AppState"];
  auto key = [NSString stringWithCString:name.c_str() encoding:NSUTF8StringEncoding];
  
  id value = [dict valueForKey:key];
  
  return facebook::react::TurboModuleConvertUtils::convertObjCObjectToJSIValue(runtime, value);
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
  
}

- (void)installJSIBindingsWithRuntime:(facebook::jsi::Runtime &)runtime callInvoker:(const std::shared_ptr<facebook::react::CallInvoker> &)callinvoker {
  
  // TODO: Refactor this......... to create new host objects that can be held onto in JS
  // Should this use host objects?
  
  auto func = HOSTFN("__installBrownie", 2) {
    
    auto brownieStore = std::make_shared<BrownieStoreObject>();
    
    auto result = jsi::Object::createFromHostObject(runtime, brownieStore);
    
    
    runtime.global().setProperty(runtime, "__brownieHostObject", result);
    
    return jsi::Value::undefined();
  });
  
  runtime.global().setProperty(runtime, "__installBrownie", func);
  
  
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeReactNativeBrownfieldModuleSpecJSI>(params);
}

@end
