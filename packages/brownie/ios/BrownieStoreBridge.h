#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface BrownieStoreBridge : NSObject

+ (void)registerStoreWithKey:(NSString *)key NS_SWIFT_NAME(registerStore(withKey:));
+ (void)removeStoreWithKey:(NSString *)key NS_SWIFT_NAME(removeStore(withKey:));

+ (void)setValue:(id)value forKey:(NSString *)propKey inStore:(NSString *)storeKey NS_SWIFT_NAME(setValue(_:forKey:inStore:));
+ (nullable id)getValueForKey:(NSString *)propKey inStore:(NSString *)storeKey NS_SWIFT_NAME(getValue(forKey:inStore:));
+ (nullable NSDictionary *)getSnapshotForStore:(NSString *)storeKey NS_SWIFT_NAME(getSnapshot(forStore:));
+ (void)setStateFromDictionary:(NSDictionary *)dict forStore:(NSString *)storeKey NS_SWIFT_NAME(setState(from:forStore:));

@end

NS_ASSUME_NONNULL_END
