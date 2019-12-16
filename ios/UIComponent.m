#import "UIComponent.h"
#import "ReactNativeBrownfield.h"
#import "ReactNativeComponentFactory.h"

@implementation UIComponent

@synthesize reactComponent = _reactComponent;
@synthesize hasChildren = _hasChildren;

-(id)initWithFrame:(CGRect)frame {
    _hasChildren = NO;
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
    _hasChildren = NO;
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

-(void)addSubview:(UIView *)view {
    [[ReactNativeBrownfield shared] registerView:_reactComponent.uuid view:view];
    _hasChildren = YES;
    [self updateProps];
}

-(void)initializeReactSubview:(UIView *)view {
    [super addSubview:view];
}

-(void)removeSubviews {
    [[ReactNativeBrownfield shared] unregisterView:_reactComponent.uuid];
    _hasChildren = NO;
    [self updateProps];
}

-(NSDictionary*)getProps {
    NSMutableDictionary *props = [NSMutableDictionary new];

    props[@"uuid"] = _reactComponent.uuid;
    if (_hasChildren) {
        props[@"hasChildren"] = @YES;
    }
    
    return props;
}

-(void)updateProps {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSMutableDictionary *props = [[self getProps] mutableCopy];

        if (self->_hasChildren) {
            props[@"hasChildren"] = @YES;
        }

        self->_reactComponent.appProperties = props;
    });
}

-(void)addReactSubview {}

@end
