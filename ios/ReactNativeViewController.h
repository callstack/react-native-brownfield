#import <UIKit/UIKit.h>

@interface ReactNativeViewController : UIViewController

@property (nonatomic, copy) NSString *moduleName;
@property (nonatomic, copy) NSDictionary *initialProperties;

-(instancetype)initWithModuleName:(NSString *)moduleName;

@end
