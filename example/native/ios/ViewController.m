//
//  ViewController.m
//  NativeExample
//
//  Created by Michal Chudziak on 23/06/2019.
//  Copyright © 2019 Callstack. All rights reserved.
//

#import "ViewController.h"
#import <ReactNativeBrownfield/BridgeManager.h>

@interface ViewController ()

@end

@implementation ViewController

- (void)viewDidLoad {
    [super viewDidLoad];
    [[BridgeManager new] test];
    // Do any additional setup after loading the view, typically from a nib.
}


@end
