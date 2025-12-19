#import "BrownieStoreBridge.h"
#import "BrownieStoreManager.h"
#import "BrownieStore.h"
#import <folly/dynamic.h>

namespace {

folly::dynamic objcToDynamic(id value) {
  if (value == nil || [value isKindOfClass:[NSNull class]]) {
    return nullptr;
  }
  if ([value isKindOfClass:[NSNumber class]]) {
    NSNumber *num = value;
    const char *type = [num objCType];
    if (strcmp(type, @encode(BOOL)) == 0 || strcmp(type, @encode(char)) == 0) {
      return [num boolValue];
    }
    if (strcmp(type, @encode(int)) == 0 || strcmp(type, @encode(long)) == 0 ||
        strcmp(type, @encode(long long)) == 0) {
      return [num longLongValue];
    }
    return [num doubleValue];
  }
  if ([value isKindOfClass:[NSString class]]) {
    return std::string([value UTF8String]);
  }
  if ([value isKindOfClass:[NSArray class]]) {
    folly::dynamic arr = folly::dynamic::array();
    for (id item in value) {
      arr.push_back(objcToDynamic(item));
    }
    return arr;
  }
  if ([value isKindOfClass:[NSDictionary class]]) {
    folly::dynamic obj = folly::dynamic::object();
    for (NSString *key in value) {
      obj[std::string([key UTF8String])] = objcToDynamic(value[key]);
    }
    return obj;
  }
  return nullptr;
}

id dynamicToObjc(const folly::dynamic &dyn) {
  if (dyn.isNull()) {
    return [NSNull null];
  }
  if (dyn.isBool()) {
    return @(dyn.getBool());
  }
  if (dyn.isInt()) {
    return @(dyn.getInt());
  }
  if (dyn.isDouble()) {
    return @(dyn.getDouble());
  }
  if (dyn.isString()) {
    return [NSString stringWithUTF8String:dyn.getString().c_str()];
  }
  if (dyn.isArray()) {
    NSMutableArray *arr = [NSMutableArray arrayWithCapacity:dyn.size()];
    for (const auto &item : dyn) {
      [arr addObject:dynamicToObjc(item) ?: [NSNull null]];
    }
    return arr;
  }
  if (dyn.isObject()) {
    NSMutableDictionary *dict =
        [NSMutableDictionary dictionaryWithCapacity:dyn.size()];
    for (const auto &pair : dyn.items()) {
      if (pair.first.isString()) {
        NSString *key =
            [NSString stringWithUTF8String:pair.first.getString().c_str()];
        dict[key] = dynamicToObjc(pair.second) ?: [NSNull null];
      }
    }
    return dict;
  }
  return nil;
}

} // namespace

@implementation BrownieStoreBridge

+ (void)registerStoreWithKey:(NSString *)key {
  auto store = std::make_shared<brownie::BrownieStore>();
  NSString *keyCopy = [key copy];

  store->setChangeCallback([keyCopy]() {
    dispatch_async(dispatch_get_main_queue(), ^{
      [[NSNotificationCenter defaultCenter]
          postNotificationName:@"BrownieStoreUpdated"
                        object:nil
                      userInfo:@{@"storeKey" : keyCopy}];
    });
  });

  brownie::BrownieStoreManager::shared().registerStore(std::string([key UTF8String]),
                                                       store);
}

+ (void)removeStoreWithKey:(NSString *)key {
  brownie::BrownieStoreManager::shared().removeStore(std::string([key UTF8String]));
}

+ (void)setValue:(id)value forKey:(NSString *)propKey inStore:(NSString *)storeKey {
  auto store =
      brownie::BrownieStoreManager::shared().getStore(std::string([storeKey UTF8String]));
  if (!store) {
    return;
  }

  folly::dynamic dynValue = objcToDynamic(value);
  store->set(std::string([propKey UTF8String]), std::move(dynValue));
}

+ (nullable id)getValueForKey:(NSString *)propKey inStore:(NSString *)storeKey {
  auto store =
      brownie::BrownieStoreManager::shared().getStore(std::string([storeKey UTF8String]));
  if (!store) {
    return nil;
  }

  folly::dynamic value = store->get(std::string([propKey UTF8String]));
  return dynamicToObjc(value);
}

+ (nullable NSDictionary *)getSnapshotForStore:(NSString *)storeKey {
  auto store =
      brownie::BrownieStoreManager::shared().getStore(std::string([storeKey UTF8String]));
  if (!store) {
    return nil;
  }

  folly::dynamic snapshot = store->getSnapshot();
  id result = dynamicToObjc(snapshot);
  if ([result isKindOfClass:[NSDictionary class]]) {
    return result;
  }
  return nil;
}

+ (void)setStateFromDictionary:(NSDictionary *)dict forStore:(NSString *)storeKey {
  auto store =
      brownie::BrownieStoreManager::shared().getStore(std::string([storeKey UTF8String]));
  if (!store) {
    return;
  }

  folly::dynamic state = objcToDynamic(dict);
  store->setState(std::move(state));
}

@end
