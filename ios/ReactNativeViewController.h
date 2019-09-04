#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface ReactNativeViewController : UIViewController

@property (nonatomic, copy) NSString *moduleName;
@property (nonatomic, copy, nullable) NSDictionary *initialProperties;

-(instancetype)initWithModuleName:(NSString *)moduleName;
-(instancetype)initWithModuleName:(NSString *)moduleName andInitialProperties:(NSDictionary*)initialProperties;

@end

NS_ASSUME_NONNULL_END