//
//  ViewController.h
//  NativeExample
//
//  Created by Michal Chudziak on 23/06/2019.
//  Copyright © 2019 Callstack. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <ReactNativeBrownfield/GreenSquare.h>

@interface ViewController : UIViewController

@property (nonatomic) BOOL isReactNativeLoaded;
@property (weak, nonatomic) IBOutlet UIView *greenSquare;
@property (weak, nonatomic) IBOutlet UIView *redSquare;
@property (nonatomic) GreenSquare *green;

@end

