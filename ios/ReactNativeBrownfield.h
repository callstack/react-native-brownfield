#import <Foundation/Foundation.h>
#import <React/RCTBridge.h>
#import <React/RCTBridgeDelegate.h>
#import <React-RCTAppDelegate/RCTRootViewFactory.h>

NS_ASSUME_NONNULL_BEGIN

@interface ReactNativeBrownfield : NSObject<RCTBridgeDelegate> {
    void (^_onBundleLoaded)(void);
}

@property (nonatomic, copy) NSString *entryFile;
@property (nonatomic, copy, nullable) NSString *fallbackResource;
@property (nonatomic, copy) NSString *bundlePath;
@property (nonatomic) RCTRootViewFactory* rootViewFactory;

/// This property controls whether the App will use the Fabric renderer of the New Architecture or not.
@property (nonatomic, assign) BOOL fabricEnabled;

/// This property controls whether React Native's new initialization layer is enabled.
@property (nonatomic, assign) BOOL bridgelessEnabled;

/// This method controls whether the `turboModules` feature of the New Architecture is turned on or off
@property (nonatomic, assign) BOOL turboModuleEnabled;

+(ReactNativeBrownfield*)shared;

-(void)startReactNative;
-(void)startReactNative:(void(^)(void))onBundleLoaded;
-(void)startReactNative:(void(^)(void))onBundleLoaded launchOptions:(NSDictionary *)launchOptions;

/// Return the bundle URL for the main bundle.
- (NSURL *__nullable)bundleURL;

@end

NS_ASSUME_NONNULL_END
