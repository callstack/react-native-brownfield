#import <UIKit/UIKit.h>
#import <React/RCTBridge.h>

NS_ASSUME_NONNULL_BEGIN

@interface ReactNativeViewController : UIViewController

@property (nonatomic, copy) NSString *moduleName;
@property (nonatomic, copy, nullable) NSDictionary *initialProperties;
@property (nonatomic, copy, nullable) RCTBridge *currentBridge;

-(instancetype)initWithModuleName:(NSString *)moduleName withBridge:(RCTBridge * _Nullable)bridge;
-(instancetype)initWithModuleName:(NSString *)moduleName withBridge:(RCTBridge * _Nullable)bridge andInitialProperties:(NSDictionary* _Nullable)initialProperties;

@end

NS_ASSUME_NONNULL_END
