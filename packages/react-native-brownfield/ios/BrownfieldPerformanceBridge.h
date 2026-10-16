#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN
@interface BrownfieldPerformanceBridge : NSObject
// Call on main. Returns NO until the JS thread or an RN bridge/proxy is available.
+ (BOOL)dispatchToJavaScript:(dispatch_block_t)block;
@end
NS_ASSUME_NONNULL_END
