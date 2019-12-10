#import <UIKit/UIKit.h>
#import "UIComponent.h"

@interface GreenSquare : UIComponent

@property (nonatomic, copy) NSString *text;

-(instancetype)initWithFrame:(CGRect)frame andText:(NSString *)text;

@end

