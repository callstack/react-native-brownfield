#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>

@interface BrownfieldEventEmitter : RCTEventEmitter <RCTBridgeModule>

+ (void)emitMessage:(NSString *)message;

@end
