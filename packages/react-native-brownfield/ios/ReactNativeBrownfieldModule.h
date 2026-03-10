#ifdef __cplusplus

#import <ReactNativeBrownfield/ReactNativeBrownfield.h>

@interface ReactNativeBrownfieldModule : NativeReactNativeBrownfieldModuleSpecBase <NativeReactNativeBrownfieldModuleSpec>

// Static helper for native code to emit events
+ (void)emitMessageFromNative:(NSString *)message;

@end

#endif
