#import "ReactNativeViewController.h"
#import <React/RCTRootView.h>
#import <React/RCTBridge.h>
#import "BridgeManager.h"

@implementation ReactNativeViewController

@synthesize _moduleName;
@synthesize _initialProperties;

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
    }
    
    self.navigationController.interactivePopGestureRecognizer.enabled = TRUE;
}

-(void)viewWillAppear:(BOOL)animated {
    UINavigationController *navController = [self navigationController];
    if (navController != nil) {
        [navController.navigationBar setHidden:YES];
    }
}

-(void)viewWillDisappear:(BOOL)animated {
    UINavigationController *navController = [self navigationController];
    if (navController != nil) {
        [navController.navigationBar setHidden:NO];
    }
}

@end
