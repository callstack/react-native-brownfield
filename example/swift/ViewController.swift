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

