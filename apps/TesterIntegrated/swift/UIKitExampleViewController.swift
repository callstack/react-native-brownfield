import UIKit
import Brownie

class UIKitExampleViewController: UIViewController {
  private var store: Store<BrownfieldStore>?
  private var cancelSubscription: (() -> Void)?

  private let counterLabel: UILabel = {
    let label = UILabel()
    label.font = .systemFont(ofSize: 24, weight: .bold)
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    return label
  }()

  private let userLabel: UILabel = {
    let label = UILabel()
    label.font = .systemFont(ofSize: 18)
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    return label
  }()

  private let nameTextField: UITextField = {
    let field = UITextField()
    field.borderStyle = .roundedRect
    field.placeholder = "Enter name"
    field.translatesAutoresizingMaskIntoConstraints = false
    return field
  }()

  private let incrementButton: UIButton = {
    var config = UIButton.Configuration.borderedProminent()
    config.title = "Increment"
    let button = UIButton(configuration: config)
    button.translatesAutoresizingMaskIntoConstraints = false
    return button
  }()

  override func viewDidLoad() {
    super.viewDidLoad()
    setupUI()
    setupStore()
  }

  private func setupUI() {
    title = "UIKit Example"
    view.backgroundColor = .systemBackground

    let titleLabel = UILabel()
    titleLabel.text = "UIKit + Brownie Store"
    titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
    titleLabel.textAlignment = .center
    titleLabel.translatesAutoresizingMaskIntoConstraints = false

    let stack = UIStackView(arrangedSubviews: [
      titleLabel,
      counterLabel,
      userLabel,
      nameTextField,
      incrementButton
    ])
    stack.axis = .vertical
    stack.spacing = 16
    stack.translatesAutoresizingMaskIntoConstraints = false

    view.addSubview(stack)

    NSLayoutConstraint.activate([
      stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20)
    ])

    incrementButton.addTarget(self, action: #selector(incrementTapped), for: .touchUpInside)
    nameTextField.addTarget(self, action: #selector(nameChanged), for: .editingChanged)
  }

  private func setupStore() {
    store = StoreManager.get(key: BrownfieldStore.storeName, as: BrownfieldStore.self)

    guard let store else {
      counterLabel.text = "Store not found"
      return
    }

    updateUI(with: store.state)

    cancelSubscription = store.subscribe { [weak self] state in
      self?.updateUI(with: state)
    }
  }

  private func updateUI(with state: BrownfieldStore) {
    counterLabel.text = "Count: \(Int(state.counter))"
    userLabel.text = "User: \(state.user.name)"

    if nameTextField.text != state.user.name && !nameTextField.isFirstResponder {
      nameTextField.text = state.user.name
    }
  }

  @objc private func incrementTapped() {
    store?.set { $0.counter += 1 }
  }

  @objc private func nameChanged() {
    guard let name = nameTextField.text else { return }
    store?.set { $0.user.name = name }
  }

  deinit {
    cancelSubscription?()
  }
}
