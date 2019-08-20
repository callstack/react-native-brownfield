//
//  ViewController.m
//  NativeExample
//
//  Created by Michal Chudziak on 23/06/2019.
//  Copyright © 2019 Callstack. All rights reserved.
//

#import "ViewController.h"
#import <ReactNativeBrownfield/ReactNativeViewController.h>

@implementation ViewController


- (void)viewDidLoad {
    [super viewDidLoad];
}

- (IBAction)openReactNative:(UIButton *)sender {
    [[self navigationController] pushViewController:[[ReactNativeViewController alloc] initWithModuleName:@"ReactNative"] animated:YES];
}


@end
