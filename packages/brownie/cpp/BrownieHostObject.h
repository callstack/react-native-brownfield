#pragma once

#include "BrownieStore.h"
#include <jsi/jsi.h>
#include <memory>

namespace brownie {

class BrownieHostObject : public facebook::jsi::HostObject {
public:
  explicit BrownieHostObject(std::shared_ptr<BrownieStore> store);

  facebook::jsi::Value get(facebook::jsi::Runtime &rt,
                           const facebook::jsi::PropNameID &name) override;

  void set(facebook::jsi::Runtime &rt, const facebook::jsi::PropNameID &name,
           const facebook::jsi::Value &value) override;

  std::vector<facebook::jsi::PropNameID>
  getPropertyNames(facebook::jsi::Runtime &rt) override;

private:
  std::shared_ptr<BrownieStore> store_;
};

} // namespace brownie
