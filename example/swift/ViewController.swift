//
//  ViewController.swift
//  SwiftExample
//
//  Created by Michal Chudziak on 25/08/2019.
//  Copyright © 2019 Callstack. All rights reserved.
//

import UIKit

class ViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
    }


    @IBAction func openReactNative(_ sender: UIButton) {
        self.navigationController?.pushViewController(
            ReactNativeViewController(moduleName: "ReactNative"),
            animated: true
        )
    }
}

