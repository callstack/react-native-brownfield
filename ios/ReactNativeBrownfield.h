#import <Foundation/Foundation.h>
#import <React/RCTBridge.h>
#import <React/RCTBridgeDelegate.h>

NS_ASSUME_NONNULL_BEGIN

@interface ReactNativeBrownfield : NSObject<RCTBridgeDelegate> {
    void (^_onBundleLoaded)(void);
}

@property (nonatomic, copy) NSString *entryFile;
@property (nonatomic, copy, nullable) NSString *fallbackResource;
@property (nonatomic, copy) NSString *bundlePath;
@property (nonatomic) RCTBridge *bridge;
@property (nonatomic) NSMutableDictionary<NSString*, UIView*> *childrenRegistry;

+(ReactNativeBrownfield*)shared;

-(void)startReactNative;
-(void)startReactNative:(void(^)(void))onBundleLoaded;
-(void)startReactNative:(void(^)(void))onBundleLoaded launchOptions:(NSDictionary *)launchOptions;

-(void)registerView:(NSString*)idx view:(UIView*)view;
-(void)unregisterView:(NSString*)idx;
-(nullable UIView*)getRegisteredView:(NSString*)idx;

NS_ASSUME_NONNULL_END

@end

