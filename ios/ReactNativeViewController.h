#import <UIKit/UIKit.h>

@interface ReactNativeViewController : UIViewController

@property (nonatomic, copy) NSString *_moduleName;
@property (nonatomic, copy) NSDictionary *_initialProperties;

-(instancetype)initWithModuleName:(NSString *)moduleName;

@end
