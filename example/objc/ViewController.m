//
//  ViewController.m
//  NativeExample
//
//  Created by Michal Chudziak on 23/06/2019.
//  Copyright © 2019 Callstack. All rights reserved.
//

#import "ViewController.h"
#import <ReactNativeBrownfield/GreenSquare.h>

@implementation ViewController

@synthesize green = _green;

- (void)viewWillLayoutSubviews {
    _green = [[GreenSquare alloc] initWithFrame:self.greenSquare.bounds andText:@"WYGRYW"];
    
    [self.redSquare addSubview:_green];
}

- (IBAction)openReactNative:(UIButton *)sender {
    _green.text = @"JAJEBIE";
    [_green setNeedsLayout];
}

@end
