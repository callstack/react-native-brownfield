#import <Foundation/Foundation.h>
#import <React/RCTBundleURLProvider.h>

#import "BridgeManager.h"

@implementation BridgeManager

@synthesize jsBundleURLForBundleRoot;
@synthesize fallbackResource;
@synthesize URLForReleaseBundleResource;
@synthesize bridge;

+ (id)shared {
    static BridgeManager *sharedBridgeManager = nil;
    
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedBridgeManager = [self new];
    });
    
    return sharedBridgeManager;
}

- (id)init {
    if (self = [super init]) {
        jsBundleURLForBundleRoot = @"index";
        fallbackResource = nil;
        URLForReleaseBundleResource = @"main.jsbundle";
    }
    return self;
}

- (void)startReactNative {
    [self startReactNative:nil];
}

- (void)startReactNative:(void(^)(void))onBundleLoaded {
    [self startReactNative:onBundleLoaded launchOptions:nil];
}

- (void)startReactNative:(void(^)(void))onBundleLoaded launchOptions:(NSDictionary *)launchOptions {
    if (bridge != nil) {
        return;
    }
    
    bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
    
    if (_onBundleLoaded != nil) {
        _onBundleLoaded = [onBundleLoaded copy];
        
        [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(jsLoaded:) name:RCTJavaScriptDidLoadNotification object:nil];
    }
}

- (void)jsLoaded:(NSNotification*)notification {
    _onBundleLoaded();
    _onBundleLoaded = nil;
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}
    
#pragma mark - RCTBridgeDelegate Methods

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {
    #if DEBUG
        return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:nil];
    #else
        NSArray<NSString *> *resourceURL = [URLForReleaseBundleResource URLForReleaseBundleResource];
        return [[NSBundle mainBundle] URLForResource:resourceURL[0] withExtension:resourceURL[1]];
    #endif
}

@end
