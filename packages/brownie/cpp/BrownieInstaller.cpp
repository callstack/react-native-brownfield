#include "BrownieInstaller.h"
#include "BrownieHostObject.h"
#include "BrownieStoreManager.h"

namespace brownie {

void BrownieInstaller::install(facebook::jsi::Runtime &runtime) {
  auto getStore = facebook::jsi::Function::createFromHostFunction(
      runtime, facebook::jsi::PropNameID::forAscii(runtime, "__getStore"), 1,
      [](facebook::jsi::Runtime &rt, const facebook::jsi::Value &,
         const facebook::jsi::Value *args, size_t count) -> facebook::jsi::Value {
        if (count < 1 || !args[0].isString()) {
          throw facebook::jsi::JSError(rt,
                                       "getStore requires a string key argument");
        }

        std::string key = args[0].asString(rt).utf8(rt);
        auto store = BrownieStoreManager::shared().getStore(key);

        if (!store) {
          return facebook::jsi::Value::undefined();
        }

        auto hostObject = std::make_shared<BrownieHostObject>(store);
        return facebook::jsi::Object::createFromHostObject(rt, hostObject);
      });

  runtime.global().setProperty(runtime, "__getStore", getStore);
}

} // namespace brownie
