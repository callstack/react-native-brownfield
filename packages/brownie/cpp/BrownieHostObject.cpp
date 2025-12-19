#include "BrownieHostObject.h"
#include <jsi/JSIDynamic.h>

namespace brownie {

BrownieHostObject::BrownieHostObject(std::shared_ptr<BrownieStore> store)
    : store_(std::move(store)) {}

facebook::jsi::Value BrownieHostObject::get(facebook::jsi::Runtime &rt,
                                            const facebook::jsi::PropNameID &name) {
  std::string propName = name.utf8(rt);

  if (propName == "unbox") {
    return facebook::jsi::Function::createFromHostFunction(
        rt, facebook::jsi::PropNameID::forAscii(rt, "unbox"), 0,
        [this](facebook::jsi::Runtime &rt, const facebook::jsi::Value &,
               const facebook::jsi::Value *, size_t) -> facebook::jsi::Value {
          auto snapshot = store_->getSnapshot();
          return facebook::jsi::valueFromDynamic(rt, snapshot);
        });
  }

  auto value = store_->get(propName);
  return facebook::jsi::valueFromDynamic(rt, value);
}

void BrownieHostObject::set(facebook::jsi::Runtime &rt,
                            const facebook::jsi::PropNameID &name,
                            const facebook::jsi::Value &value) {
  std::string propName = name.utf8(rt);
  auto dynamicValue = facebook::jsi::dynamicFromValue(rt, value);
  store_->set(propName, std::move(dynamicValue));
}

std::vector<facebook::jsi::PropNameID>
BrownieHostObject::getPropertyNames(facebook::jsi::Runtime &rt) {
  std::vector<facebook::jsi::PropNameID> names;
  names.push_back(facebook::jsi::PropNameID::forAscii(rt, "unbox"));

  auto snapshot = store_->getSnapshot();
  if (snapshot.isObject()) {
    for (const auto &pair : snapshot.items()) {
      if (pair.first.isString()) {
        names.push_back(facebook::jsi::PropNameID::forUtf8(rt, pair.first.getString()));
      }
    }
  }

  return names;
}

} // namespace brownie
