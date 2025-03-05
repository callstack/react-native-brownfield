#import <Foundation/Foundation.h>
#import <React/RCTBridge.h>
#import <React/RCTBridgeDelegate.h>
#import <React-RCTAppDelegate/RCTReactNativeFactory.h>
#import <React-RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>

NS_ASSUME_NONNULL_BEGIN

@interface ReactNativeBrownfield : RCTDefaultReactNativeFactoryDelegate {
    void (^_onBundleLoaded)(void);
}

@property (nonatomic, copy) NSString *entryFile;
@property (nonatomic, copy, nullable) NSString *fallbackResource;
@property (nonatomic, copy) NSString *bundlePath;
@property (nonatomic) RCTReactNativeFactory* reactNativeFactory;

+(ReactNativeBrownfield*)shared;

-(void)startReactNative;
-(void)startReactNative:(void(^)(void))onBundleLoaded;
-(void)startReactNative:(void(^)(void))onBundleLoaded launchOptions:(NSDictionary *)launchOptions;

/// Return the bundle URL for the main bundle.
- (NSURL *__nullable)bundleURL;

@end

NS_ASSUME_NONNULL_END
