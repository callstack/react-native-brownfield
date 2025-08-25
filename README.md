<a href="https://www.callstack.com/open-source?utm_campaign=generic&utm_source=github&utm_medium=referral&utm_content=react-native-brownfield" align="center">
  <img alt="React Native Brownfield" src="https://github.com/user-attachments/assets/55fcdff5-54f0-4081-adf6-55dfa5c29af2">
</a>

<p align="center">
  A set of helpers to make your brownfield integration smooth and easy.
</p>

---

[![Build Status][build-badge]][build]
[![Version][version-badge]][package]
[![MIT License][license-badge]][license]

[![PRs Welcome][prs-welcome-badge]][prs-welcome]
[![Chat][chat-badge]][chat]
[![Code of Conduct][coc-badge]][coc]
[![Sponsored by Callstack][callstack-badge]][callstack]

[![tweet][tweet-badge]][tweet]

## Features

- **Easily integrate** React Native with an existing native app
- Start React Native with **one method** and invoke code as soon as it's loaded
- Compatible with **both legacy and new React Native architecture**!
- Reuse the same instance of React Native between different components
- Use predefined **native building blocks** - crafted for React Native
- Disable and enable **native gestures and hardware buttons** from JavaScript
- Works well with **any native navigation** pattern, as well as any React Native JavaScript-based navigation
- Compatible with all native languages **Objective-C**, **Swift**, **Java** and **Kotlin**
- Supports UIKit and SwiftUI on iOS and Fragments and Jetpack Compose on Android

## Installation

The React Native Brownfield library is intended to be installed in a React Native app that is later consumed as a framework artifact by your native iOS or Android app.

In your React Native project run:

```sh
npm install @callstack/react-native-brownfield
```

## Usage

<a href="https://www.callstack.com/ebooks/incremental-react-native-adoption-in-native-apps?utm_campaign=brownfield&utm_source=github&utm_medium=referral&utm_content=react-native-brownfield" align="center">
  <img alt="Download a free copy of Incremental React Native adoption in native apps ebook" src="https://github.com/user-attachments/assets/ba42bb29-1e7a-4683-80c5-2602afb1a7e6">
</a>

### Packaging React Native app as a framework

First, we need to package our React Native app as an XCFramework or Fat-AAR.

#### With RNEF

Follow [Integrating with Native Apps](https://www.rnef.dev/docs/brownfield/intro) steps in RNEF docs and run:

- `rnef package:ios` for iOS
- `rnef package:aar` for Android

#### With custom scripts

Instead of using RNEF, you can create your own custom packaging scripts. Here are base versions for iOS and Android that you'll need to adjust for your project-specific setup:

- [Example iOS script](https://github.com/callstackincubator/modern-brownfield-ref/blob/main/scripts/build-xcframework.sh)
- [Example Android script](https://github.com/callstackincubator/modern-brownfield-ref/blob/main/scripts/build-aar.sh)

### Native iOS app

In your native iOS app, initialize React Native and display it where you like. For example, to display React Native views in SwiftUI, use the provided `ReactNativeView` component:

```swift
import SwiftUI
import ReactBrownfield # exposed by RN app framework

@main
struct MyApp: App {
  init() {
    ReactNativeBrownfield.shared.startReactNative {
      print("React Native bundle loaded")
    }
  }

  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}

struct ContentView: View {
  var body: some View {
    NavigationView {
      VStack {
        Text("Welcome to the Native App")
          .padding()

        NavigationLink("Push React Native Screen") {
          ReactNativeView(moduleName: "ReactNative")
            .navigationBarHidden(true)
        }
      }
    }
  }
}
```

For more detailed instructions and API for iOS, see docs for:

- [Objective C](docs/OBJECTIVE_C.md)
- [Swift](docs/SWIFT.md)

### Native Android app

In your native Android app, create a new `RNAppFragment.kt`:

```kt

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.callstack.rnbrownfield.RNViewFactory // exposed by RN app framework

class RNAppFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?,
    ): View? =
        this.context?.let {
            RNViewFactory.createFrameLayout(it)
        }
}
```

Add a button to your `activity_main.xml`:

```xml
<Button
    android:id="@+id/show_rn_app_btn"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="Show RN App"
    app:layout_constraintBottom_toBottomOf="parent"
    app:layout_constraintEnd_toEndOf="parent"
    app:layout_constraintStart_toStartOf="parent"
    app:layout_constraintTop_toTopOf="parent" />
```

Add a fragment container:

```xml
<FrameLayout
    android:id="@+id/fragmentContainer"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

Update your `MainActivity` to initialize React Native and show the fragment:

```kt
class MainActivity : AppCompatActivity() {
    private lateinit var showRNAppBtn: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ReactNativeHostManager.shared.initialize(this.application)

        showRNAppBtn = findViewById(R.id.show_rn_app_btn)
        showRNAppBtn.setOnClickListener {
            supportFragmentManager
                .beginTransaction()
                .replace(R.id.fragmentContainer, RNAppFragment())
                .commit()
        }
    }

}
```

For more detailed instructions and API for Android, see docs for:

- [Java](docs/JAVA.md)
- [Kotlin](docs/KOTLIN.md)

### JavaScript Module

Besides native components, we are exposing JavaScript functions to control the behavior of those components from React Native app.

To use the module, import it:

```js
import ReactNativeBrownfield from '@callstack/react-native-brownfield';
```

and use the available methods:

#### setNativeBackGestureAndButtonEnabled(enabled: boolean)

A method used to toggle iOS native back gesture and Android hardware back button.

```ts
ReactNativeBrownfield.setNativeBackGestureAndButtonEnabled(true);
```

#### popToNative(animated[iOS only]: boolean)

A method to pop to native screen used to push React Native experience.

```ts
ReactNativeBrownfield.popToNative(true);
```

> **Note:** These methods work only with native components provided by this library.

## Made with ❤️ at Callstack

React Native Brownfield is an open source project and will always remain free to use. If you think it's cool, please star it 🌟. [Callstack](https://callstack.com) is a group of React and React Native geeks, contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these or just want to say hi!

Like the project? ⚛️ [Join the team](https://callstack.com/careers/?utm_campaign=Senior_RN&utm_source=github&utm_medium=readme) who does amazing stuff for clients and drives React Native Open Source! 🔥

## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
| [<img src="https://avatars0.githubusercontent.com/u/7837457?s=460&v=4" width="100px;" alt="Michał Chudziak"/><br /><sub><b>Michał Chudziak</b></sub>](https://twitter.com/michalchudziak)<br />[💻](https://github.com/callstack/react-native-brownfield/commits?author=michalchudziak "Code") [📖](https://github.com/callstack/react-native-brownfield/commits?author=michalchudziak "Documentation") [🤔](#ideas-michalchudziak "Ideas, Planning, & Feedback") | [<img src="https://avatars1.githubusercontent.com/u/16336501?s=400&v=4" width="100px;" alt="Piotr Drapich"/><br /><sub><b>Piotr Drapich</b></sub>](https://twitter.com/dratwas)<br />[💻](https://github.com/callstack/react-native-brownfield/commits?author=dratwas "Code") [🤔](#ideas-dratwas "Ideas, Planning, & Feedback") |
| :---: | :---: |

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind welcome!

<!-- badges -->

[build-badge]: https://img.shields.io/circleci/build/github/callstack/react-native-brownfield/master.svg?style=flat-square
[build]: https://circleci.com/gh/callstack/react-native-brownfield
[version-badge]: https://img.shields.io/npm/v/@callstack/react-native-brownfield.svg?style=flat-square
[package]: https://www.npmjs.com/package/@callstack/react-native-brownfield
[license-badge]: https://img.shields.io/npm/l/@callstack/react-native-brownfield.svg?style=flat-square
[license]: https://opensource.org/licenses/MIT
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs-welcome]: http://makeapullrequest.com
[coc-badge]: https://img.shields.io/badge/code%20of-conduct-ff69b4.svg?style=flat-square
[coc]: https://github.com/callstack/react-native-brownfield/blob/master/CODE_OF_CONDUCT.md
[all-contributors-badge]: https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square
[chat-badge]: https://img.shields.io/discord/613446453762719798.svg?style=flat-square&colorB=758ED3
[chat]: https://discord.gg/2SR9Mua
[tweet-badge]: https://img.shields.io/badge/tweet-%23reacnativebrownfield-blue.svg?style=flat-square&colorB=1DA1F2&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAUCAYAAACXtf2DAAAAAXNSR0IArs4c6QAAAaRJREFUOBGtlM8rBGEYx3cWtRHJRaKcuMtBSitxkCQ3LtzkP9iUUu5ODspRHLhRLtq0FxeicEBC2cOivcge%2FMgan3fNM8bbzL4zm6c%2BPT%2Fe7%2FO8887svrFYBWbbtgWzsAt3sAcpqJFxxF1QV8oJFqFPFst5dLWQAT87oTgPB7DtziFRT1EA4yZolsFkhwjGYFRO8Op0KD8HVe7unoB6PRTBZG8IctAmG1xrHcfkQ2B55sfI%2ByGMXSBqV71xZ8CWdxBxN6ThFuECDEAL%2Bc9HIzDYumVZ966GZnX0SzCZvEqTbkaGywkyFE6hKAsBPhFQ18uPUqh2ggJ%2BUor%2F4M%2F%2FzOC8g6YzR1i%2F8g4vvSI%2ByD7FFNjexQrjHd8%2BnjABI3AU4Wl16TuF1qANGll81jsi5qu%2Bw6XIsCn4ijhU5FmCJpkV6BGNw410hfSf6JKBQ%2FUFxHGYBnWnmOwDwYQ%2BwzdHqO75HtiAMJfaC7ph32FSRJCENUhDHsLaJkL%2FX4wMF4%2BwA5bgAcrZE4sr0Cu9Jq9fxyrvBHWbNkMD5CEHWTjjT2m6r5D92jfmbbKJEWuMMAAAAABJRU5ErkJggg%3D%3D
[tweet]: https://twitter.com/intent/tweet?text=Check%20out%20react-native-brownfield!%20https://github.com/callstack/react-native-brownfield%20%F0%9F%91%8D
[callstack-badge]: https://callstack.com/images/callstack-badge.svg
[callstack]: https://callstack.com/open-source/?utm_source=github.com&utm_medium=referral&utm_campaign=rnbrownfield&utm_term=readme
