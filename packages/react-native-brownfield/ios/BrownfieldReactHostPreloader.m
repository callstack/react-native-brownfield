#import "BrownfieldReactHostPreloader.h"

// This file is plain Objective-C, and not Objective-C++. The umbrella header of
// React-RCTAppDelegate imports the Hermes and JSI headers if `__cplusplus` is set. This pod does
// not have the necessary search paths for those headers. Without C++, the compiler ignores those
// imports. The compiler then builds the module in the same way that Swift imports it.
//
// The name of the pod changes if the build makes it a framework. Thus you must try each possible
// name. Expo uses the same method in `RCTAppDelegateUmbrella.h`.
#if __has_include(<React_RCTAppDelegate/RCTRootViewFactory.h>)
#import <React_RCTAppDelegate/RCTReactNativeFactory.h>
#import <React_RCTAppDelegate/RCTRootViewFactory.h>
#elif __has_include(<React-RCTAppDelegate/RCTRootViewFactory.h>)
#import <React-RCTAppDelegate/RCTReactNativeFactory.h>
#import <React-RCTAppDelegate/RCTRootViewFactory.h>
#else
#import <React/RCTReactNativeFactory.h>
#import <React/RCTRootViewFactory.h>
#endif

NS_ASSUME_NONNULL_BEGIN

// `RCTBundleConfiguration` first exists in React Native 0.84. React Native 0.83 does not declare
// the class. This forward declaration lets the file name the type with both versions.
@class RCTBundleConfiguration;

/**
 * The two shapes of `initializeReactHostWithLaunchOptions:...`. React Native 0.83 has the shape
 * without `bundleConfiguration:`. React Native 0.84 added that parameter and removed the earlier
 * shape. No header tells the two versions apart at compile time, thus this file declares both
 * shapes and `respondsToSelector:` selects one at run time. The declarations are equal to the
 * React Native declarations. The compiler then accepts the file with both versions.
 */
@protocol BrownfieldReactHostInitializing <NSObject>

- (void)initializeReactHostWithLaunchOptions:(NSDictionary *__nullable)launchOptions
                         bundleConfiguration:(RCTBundleConfiguration *)bundleConfiguration
                        devMenuConfiguration:(RCTDevMenuConfiguration *)devMenuConfiguration;

- (void)initializeReactHostWithLaunchOptions:(NSDictionary *__nullable)launchOptions
                        devMenuConfiguration:(RCTDevMenuConfiguration *)devMenuConfiguration;

@end

/**
 * `RCTReactNativeFactory.bundleConfiguration` also first exists in React Native 0.84.
 */
@protocol BrownfieldBundleConfigurationProviding <NSObject>

@property (nonatomic, readonly) RCTBundleConfiguration *bundleConfiguration;

@end

NS_ASSUME_NONNULL_END

@implementation BrownfieldReactHostPreloader

+ (void)preloadWithReactNativeFactory:(id)reactNativeFactory
                        launchOptions:(NSDictionary *_Nullable)launchOptions
{
  RCTReactNativeFactory *factory = (RCTReactNativeFactory *)reactNativeFactory;
  RCTRootViewFactory *rootViewFactory = factory.rootViewFactory;

  // `initializeReactHostWithLaunchOptions:...` returns early if a view, or an earlier preload,
  // created a host. Thus this method makes no other check. React Native declares
  // `rootViewFactory` as not nullable, and this guard is only a protection.
  if (rootViewFactory == nil) {
    return;
  }

  id<BrownfieldReactHostInitializing> hostInitializer = (id)rootViewFactory;
  SEL initializeWithBundleConfiguration =
      @selector(initializeReactHostWithLaunchOptions:bundleConfiguration:devMenuConfiguration:);
  SEL initializeWithDevMenuConfiguration =
      @selector(initializeReactHostWithLaunchOptions:devMenuConfiguration:);

  // Get the configurations from the factory. Do not make new configurations from the default
  // values. The Expo runtime sends `RCTReactNativeFactory.devMenuConfiguration` from
  // `ExpoReactNativeFactory.recreateRootView:`, thus the factory value keeps the two runtimes
  // equal.
  //
  // The preloaded host is equal to a host that a view creates later, but the two paths send
  // different objects. The bare runtime creates the view with
  // `viewWithModuleName:initialProperties:launchOptions:`, and that method sends
  // `[RCTBundleConfiguration defaultConfiguration]` and `[RCTDevMenuConfiguration
  // defaultConfiguration]`. The values are equal:
  //   - `RCTReactNativeFactory.bundleConfiguration` gives `[RCTBundleConfiguration
  //     defaultConfiguration]` while nobody sets another value.
  //   - `RCTReactNativeFactory.devMenuConfiguration` is nil by default.
  //     `RCTDevMenuConfigurationDecorator` does nothing with nil, and `RCTDevMenu` and
  //     `RCTDevSettings` keep their own default values. Those values are equal to
  //     `[RCTDevMenuConfiguration defaultConfiguration]`, because the two sides read `RCT_DEV_MENU`.
  if ([hostInitializer respondsToSelector:initializeWithBundleConfiguration]) {
    id<BrownfieldBundleConfigurationProviding> configurationProvider = (id)factory;

    [hostInitializer initializeReactHostWithLaunchOptions:launchOptions
                                      bundleConfiguration:configurationProvider.bundleConfiguration
                                     devMenuConfiguration:factory.devMenuConfiguration];
  } else if ([hostInitializer respondsToSelector:initializeWithDevMenuConfiguration]) {
    [hostInitializer initializeReactHostWithLaunchOptions:launchOptions
                                     devMenuConfiguration:factory.devMenuConfiguration];
  } else {
    // A React Native version with a third shape of the method. Do not crash. The first React
    // Native view creates the host, as without a preload.
    NSLog(
        @"%@",
        @"ReactNativeBrownfield: startReactNative did not preload the JavaScript bundle, because "
        @"this React Native version has no known initializeReactHostWithLaunchOptions: method. The "
        @"first React Native view loads the bundle.");
  }
}

@end
