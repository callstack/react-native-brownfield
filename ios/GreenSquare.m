#import "GreenSquare.h"
#import "ReactNativeComponent.h"
#import "ReactNativeComponentFactory.h"

@implementation GreenSquare

@synthesize text = _text;

-(instancetype)initWithFrame:(CGRect)frame andText:(NSString *)text {
    _text = text;
    return [super initWithFrame:frame];
}

- (void)awakeFromNib {
    [super awakeFromNib];
    [self setNeedsDisplay];
    [self setNeedsLayout];
    [self layoutIfNeeded];
}

-(NSDictionary*)getProps {
    NSMutableDictionary *propsMap = [NSMutableDictionary new];
    
    if (_text != nil) {
        propsMap[@"text"] = _text;
    }

    return propsMap;
}

-(void)addReactSubview {
    self.reactComponent = [ReactNativeComponentFactory create:GreenSquareReactComponent withInitialProperties:[self getProps]];
     
     [self addSubview: self.reactComponent];
}

@end
