#import "ReactNativeViewController.h"
#import <React/RCTRootView.h>
#import <React/RCTBridge.h>
#import "ReactNativeBrownfield.h"
#import "ReactNativeBrownfieldNotifications.h"

@implementation ReactNativeViewController

@synthesize moduleName = _moduleName;
@synthesize initialProperties = _initialProperties;

-(instancetype)initWithModuleName:(NSString *)moduleName {
    return [self initWithModuleName:moduleName andInitialProperties:nil];
}

-(instancetype)initWithModuleName:(NSString *)moduleName
             andInitialProperties:(NSDictionary*)initialProperties {
    self = [super init];
    _moduleName = moduleName;
    _initialProperties = initialProperties;
    
    return self;
}

-(void)viewDidLoad {
    RCTRootViewFactory *factory = [[ReactNativeBrownfield shared] rootViewFactory];
    if (factory == nil) {
        NSLog(@"Error: You need to start React Native in order to use ReactNativeViewController, make sure to run [[BridgeManager shared] startReactNative] before instantiating it.");
        return;
    }

    if (_moduleName) {
        self.view = [factory viewWithModuleName:_moduleName initialProperties:_initialProperties];
        
        [[NSNotificationCenter defaultCenter]
            addObserver:self selector:@selector(togglePopGestureRecognizer:)
            name:TogglePopGestureRecognizerNotification object:nil];
        [[NSNotificationCenter defaultCenter]
         addObserver:self selector:@selector(popToNative:)
         name:PopToNativeNotification object:nil];
    }
}

- (void)dealloc {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)togglePopGestureRecognizer:(NSNotification*)notification {
    NSDictionary *userInfo = notification.userInfo;
    BOOL enabled = [[userInfo objectForKey:@"enabled"] boolValue];
    dispatch_async(dispatch_get_main_queue(), ^{
        self.navigationController.interactivePopGestureRecognizer.enabled = enabled;
    });
}

- (void)popToNative:(NSNotification*)notification {
    NSDictionary *userInfo = notification.userInfo;
    BOOL animated = [[userInfo objectForKey:@"animated"] boolValue];
    
    dispatch_async(dispatch_get_main_queue(), ^{
        [self.navigationController popViewControllerAnimated:animated];
    });
}

@end
