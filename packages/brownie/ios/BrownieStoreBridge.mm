#import "BrownieStoreBridge.h"
#import "BrownieStoreManager.h"
#import "BrownieStore.h"
#import <react/utils/FollyConvert.h>

using namespace facebook::react;

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

  store->set(std::string([propKey UTF8String]), convertIdToFollyDynamic(value));
}

+ (nullable id)getValueForKey:(NSString *)propKey inStore:(NSString *)storeKey {
  auto store =
      brownie::BrownieStoreManager::shared().getStore(std::string([storeKey UTF8String]));
  if (!store) {
    return nil;
  }

  return convertFollyDynamicToId(store->get(std::string([propKey UTF8String])));
}

+ (nullable NSDictionary *)getSnapshotForStore:(NSString *)storeKey {
  auto store =
      brownie::BrownieStoreManager::shared().getStore(std::string([storeKey UTF8String]));
  if (!store) {
    return nil;
  }

  id result = convertFollyDynamicToId(store->getSnapshot());
  return [result isKindOfClass:[NSDictionary class]] ? result : nil;
}

+ (void)setStateFromDictionary:(NSDictionary *)dict forStore:(NSString *)storeKey {
  auto store =
      brownie::BrownieStoreManager::shared().getStore(std::string([storeKey UTF8String]));
  if (!store) {
    return;
  }

  store->setState(convertIdToFollyDynamic(dict));
}

@end
