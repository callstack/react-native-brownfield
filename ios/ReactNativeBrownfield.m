#import <Foundation/Foundation.h>
#import <React/RCTBundleURLProvider.h>

#import "ReactNativeBrownfield.h"

@implementation ReactNativeBrownfield

@synthesize entryFile = _entryFile;
@synthesize fallbackResource = _fallbackResource;
@synthesize bundlePath = _bundlePath;
@synthesize bridge;

+ (ReactNativeBrownfield*)shared {
    static ReactNativeBrownfield *sharedBridgeManager = nil;
    
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        sharedBridgeManager = [self new];
    });
    
    return sharedBridgeManager;
}

- (id)init {
    if (self = [super init]) {
        _entryFile = @"index";
        _fallbackResource = nil;
        _bundlePath = @"main.jsbundle";
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
    
    if (onBundleLoaded != nil) {
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
        return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:_entryFile];
    #else
        NSArray<NSString *> *resourceURLComponents = [_bundlePath componentsSeparatedByString:@"."];
        NSRange withoutLast;
    
        withoutLast.location = 0;
        withoutLast.length = [resourceURLComponents count] - 2;
    
        NSArray<NSString *> *resourceURLComponentsWithoutExtension = [resourceURLComponents subarrayWithRange:withoutLast];
    
        return [[NSBundle mainBundle]
                    URLForResource:[resourceURLComponentsWithoutExtension componentsJoinedByString:@""]
                    withExtension:resourceURLComponents[resourceURLComponents.count - 1]
               ];
    #endif
}

@end
