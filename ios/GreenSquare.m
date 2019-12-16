#import "GreenSquare.h"
#import "ReactNativeComponent.h"
#import "ReactNativeComponentFactory.h"

@implementation GreenSquare

@synthesize text = _text;

-(instancetype)initWithFrame:(CGRect)frame andText:(NSString *)text {
    _text = text;
    return [super initWithFrame:frame];
}

-(NSDictionary*)getProps {
    NSMutableDictionary *propsMap = [[super getProps] mutableCopy];
    
    if (_text != nil) {
        propsMap[@"text"] = _text;
    }

    return propsMap;
}

-(void)addReactSubview {
    self.reactComponent = [ReactNativeComponentFactory create:GreenSquareReactComponent withInitialProperties:[self getProps]];
     
     [super initializeReactSubview: self.reactComponent];
}

@end
