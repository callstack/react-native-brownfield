#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN
@interface BrownfieldPerformanceBridge : NSObject
// Returns NO until an RN bridge/bridge proxy is available.
+ (BOOL)dispatchToJavaScript:(dispatch_block_t)block;
@end
NS_ASSUME_NONNULL_END
