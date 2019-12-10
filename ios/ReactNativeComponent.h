#import <UIKit/UIKit.h>
#import <React/RCTRootView.h>
#import <React/RCTBridge.h>

@interface ReactNativeComponent : RCTRootView

@property (nonatomic, copy) NSString *uuid;
@property (nonatomic, copy) NSMutableDictionary *handlersRegistry;

-(instancetype)initWithBridge:(RCTBridge *)bridge moduleName:(NSString *)name initialProperties:(NSDictionary *)initialProperties;

@end

