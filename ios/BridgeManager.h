#import <Foundation/Foundation.h>
#import <React/RCTBridge.h>
#import <React/RCTBridgeDelegate.h>

@interface BridgeManager : NSObject<RCTBridgeDelegate> {
    void (^_onBundleLoaded)(void);
}

@property (nonatomic, copy) NSString *jsBundleURLForBundleRoot;
@property (nonatomic, copy) NSString *fallbackResource;
@property (nonatomic, copy) NSString *URLForReleaseBundleResource;
@property (nonatomic) RCTBridge *bridge;

+(id)shared;

-(void)startReactNative;
-(void)startReactNative:(void(^)(void))onBundleLoaded;
-(void)startReactNative:(void(^)(void))onBundleLoaded launchOptions:(NSDictionary *)launchOptions;

@end
