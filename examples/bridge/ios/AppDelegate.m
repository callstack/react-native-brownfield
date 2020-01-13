//
//  AppDelegate.m
//  NativeExample
//
//  Created by Michal Chudziak on 23/06/2019.
//  Copyright © 2019 Callstack. All rights reserved.
//

#import "AppDelegate.h"
#import <ReactNativeBrownfield/ReactNativeBrownfield.h>

@interface AppDelegate ()

@end

@implementation AppDelegate


- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    ReactNativeBrownfield *reactNativeBrownfieldManager = [ReactNativeBrownfield shared];
    reactNativeBrownfieldManager.entryFile = @"examples/bridge/index";
    [reactNativeBrownfieldManager startReactNative:^(void){
        NSLog(@"React Native started");
    }];
    
    return YES;
}

@end
