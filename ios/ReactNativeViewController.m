#import "ReactNativeViewController.h"
#import <React/RCTRootView.h>
#import <React/RCTBridge.h>
#import "BridgeManager.h"
#import "RNBrownfieldNotifications.h"

@implementation ReactNativeViewController

@synthesize moduleName = _moduleName;
@synthesize initialProperties = _initialProperties;

-(instancetype)initWithModuleName:(NSString *)moduleName {
    self = [super init];
    _moduleName = moduleName;
    
    return self;
}

-(void)viewDidLoad {
    RCTBridge *bridge = [[BridgeManager shared] bridge];
    if (bridge == nil) {
        NSLog(@"Error: You need to start React Native in order to use ReactNativeViewController, make sure to run [[BridgeManager shared] startReactNative] before instantiating it.");
        return;
    }

    if (_moduleName) {
        RCTRootView *reactView = [[RCTRootView alloc] initWithBridge:bridge moduleName:_moduleName initialProperties:_initialProperties];
        self.view = reactView;
        
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
    self.navigationController.interactivePopGestureRecognizer.enabled = enabled;
}

- (void)popToNative:(NSNotification*)notification {
    NSDictionary *userInfo = notification.userInfo;
    BOOL animated = [[userInfo objectForKey:@"animated"] boolValue];
    
    dispatch_async(dispatch_get_main_queue(), ^{
        [self.navigationController popViewControllerAnimated:animated];
    });
}

@end
