#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/**
 * Creates and starts the React Host, but does not create a view. React Native loads and evaluates
 * the JavaScript bundle immediately, and not when it mounts the first React Native view.
 * `viewWithModuleName:` makes the same call internally, thus a view that you create later uses the
 * host that is ready.
 *
 * This class is in Objective-C, because Swift cannot make this call:
 * `RCTReactNativeFactory.devMenuConfiguration` is nullable, but the related parameter is not
 * nullable.
 */
@interface BrownfieldReactHostPreloader : NSObject

/**
 * Call this method on the main thread. If a host is already available, this method does nothing.
 *
 * @param reactNativeFactory An `RCTReactNativeFactory`, or a subclass, for example
 *   `ExpoReactNativeFactory`. The type is `id`, because this header must stay free of the React
 *   Native imports.
 * @param launchOptions The launch options for the React Host.
 */
+ (void)preloadWithReactNativeFactory:(id)reactNativeFactory
                        launchOptions:(nullable NSDictionary *)launchOptions;

@end

NS_ASSUME_NONNULL_END
