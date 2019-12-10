#import "UIComponent.h"
#import "ReactNativeComponentFactory.h"

@implementation UIComponent

@synthesize reactComponent = _reactComponent;

-(id)initWithFrame:(CGRect)frame {
    if([self class] == [UIComponent class]) {
        [self doesNotRecognizeSelector:_cmd];
        return nil;
    }
    
    if ((self = [super initWithFrame:frame])){
         [self addReactSubview];
    }
    return self;
}

-(id)initWithCoder:(NSCoder*)aDecoder {
    if([self class] == [UIComponent class]) {
        [self doesNotRecognizeSelector:_cmd];
        return nil;
    }
    
    if ((self = [super initWithCoder:aDecoder])){
         [self addReactSubview];
    }
    return self;
}

-(void)layoutSubviews {
    [self updateProps];
    [super layoutSubviews];
}

-(NSDictionary*)getProps {
    [self doesNotRecognizeSelector:_cmd];
    return nil;
}

-(void)updateProps {
    dispatch_async(dispatch_get_main_queue(), ^{
        self->_reactComponent.appProperties = [self getProps];
    });
}

-(void)addReactSubview {
    [self doesNotRecognizeSelector:_cmd];
}

@end
