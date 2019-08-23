#import <UIKit/UIKit.h>

@interface ReactNativeViewController : UIViewController

@property (nonatomic, copy) NSString *moduleName;
@property (nonatomic, copy) NSDictionary *initialProperties;

-(instancetype)initWithModuleName:(NSString *)moduleName;
-(instancetype)initWithModuleName:(NSString *)moduleName andInitialProperties:(NSDictionary*)initialProperties;

@end
