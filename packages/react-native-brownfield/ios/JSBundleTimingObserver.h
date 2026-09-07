#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

// Posted on main after the timing snapshot is ready.
FOUNDATION_EXPORT NSNotificationName const JSBundleTimingDidLoadNotification;

/**
 * Captures JS bundle timings from `RCTPerformanceLogger` when React Native
 * finishes (or fails) loading the bundle.
 *
 * The observer registers at binary load, before Swift host singletons run.
 */
@interface JSBundleTimingObserver : NSObject

@property (class, nonatomic, readonly, nullable) NSNumber *loadMs;
@property (class, nonatomic, readonly, nullable) NSNumber *executeMs;
@property (class, nonatomic, readonly, nullable) NSNumber *instanceInitMs;

+ (void)reset;

@end

NS_ASSUME_NONNULL_END
