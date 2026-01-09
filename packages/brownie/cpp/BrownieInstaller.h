#pragma once

#include <jsi/jsi.h>

namespace brownie {

class BrownieInstaller {
public:
  static void install(facebook::jsi::Runtime &runtime);
};

} // namespace brownie
