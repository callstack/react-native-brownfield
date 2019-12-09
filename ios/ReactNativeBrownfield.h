#import <Foundation/Foundation.h>
#import <React/RCTBridge.h>
#import <React/RCTBridgeDelegate.h>

@interface ReactNativeBrownfield : NSObject<RCTBridgeDelegate> {
    void (^_onBundleLoaded)(void);
}

@property (nonatomic, copy) NSString *entryFile;
@property (nonatomic, copy, nullable) NSString *fallbackResource;
@property (nonatomic, copy) NSString *bundlePath;
@property (nonatomic) RCTBridge *bridge;

+(ReactNativeBrownfield*)shared;

-(void)startReactNative;
-(void)startReactNative:(void(^)(void))onBundleLoaded;
-(void)startReactNative:(void(^)(void))onBundleLoaded launchOptions:(NSDictionary *)launchOptions;

@end

