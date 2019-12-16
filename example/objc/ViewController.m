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
    UILabel *label = [[UILabel alloc] initWithFrame:CGRectMake(0, 0, 300, 50)];
    label.backgroundColor = [UIColor clearColor];
    label.numberOfLines = 0;
    label.text = @"Your Text";
    
    [_green addSubview:label];
    [_green setNeedsLayout];
}

@end
