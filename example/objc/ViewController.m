//
//  ViewController.m
//  NativeExample
//
//  Created by Michal Chudziak on 23/06/2019.
//  Copyright © 2019 Callstack. All rights reserved.
//

#import "ViewController.h"
#import <ReactNativeBrownfield/ReactNativeViewController.h>
#import <ReactNativeBrownfield/ReactNativeComponentFactory.h>

@implementation ViewController


- (void)viewDidLayoutSubviews {
    [[ReactNativeComponentFactory create:GreenSquare withInitialProperties:nil] attachToSuperview:self.greenSquare];
    [[ReactNativeComponentFactory create:RedSquare withInitialProperties:nil] attachToSuperview:self.redSquare];
}

- (IBAction)openReactNative:(UIButton *)sender {
    [[self navigationController] pushViewController:[[ReactNativeViewController alloc] initWithModuleName:@"ReactNative"] animated:YES];
}

@end
