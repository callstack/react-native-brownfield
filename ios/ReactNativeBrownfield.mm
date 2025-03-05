#import <Foundation/Foundation.h>
#import <React/RCTBundleURLProvider.h>
#import <React-RCTAppDelegate/RCTReactNativeFactory.h>
#import "ReactNativeBrownfield.h"
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>

@implementation ReactNativeBrownfield

@synthesize entryFile = _entryFile;
@synthesize fallbackResource = _fallbackResource;
@synthesize bundlePath = _bundlePath;

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
  if (_reactNativeFactory != nil) {
    return;
  }

  self.dependencyProvider = [[RCTAppDependencyProvider alloc] init];
  _reactNativeFactory = [[RCTReactNativeFactory alloc] initWithDelegate:self];
  
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

- (NSURL *)bundleURL {
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

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge {
  return self.bundleURL;
}

@end
