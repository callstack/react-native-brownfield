//
//  ViewController.m
//  NativeExample
//
//  Created by Michal Chudziak on 23/06/2019.
//  Copyright © 2019 Callstack. All rights reserved.
//

#import "ViewController.h"
#import <ReactNativeBrownfield/BridgeManager.h>
#import <ReactNativeBrownfield/ReactNativeViewController.h>

@implementation ViewController

@synthesize isReactNativeLoaded;

- (void)viewDidLoad {
    [super viewDidLoad];
    [[BridgeManager shared] startReactNative:^(void){
        self.isReactNativeLoaded = YES;
    }];
}

- (IBAction)openReactNative:(UIButton *)sender {
    if (isReactNativeLoaded) {
        [[self navigationController] pushViewController:[[ReactNativeViewController alloc] initWithModuleName:@"ReactNative"] animated:YES];
    }
}


@end
