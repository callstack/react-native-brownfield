#include "BrownieStoreManager.h"

namespace brownie {

BrownieStoreManager &BrownieStoreManager::shared() {
  static BrownieStoreManager instance;
  return instance;
}

void BrownieStoreManager::registerStore(const std::string &key,
                                        std::shared_ptr<BrownieStore> store) {
  std::lock_guard<std::mutex> lock(mutex_);
  stores_[key] = std::move(store);
}

std::shared_ptr<BrownieStore>
BrownieStoreManager::getStore(const std::string &key) const {
  std::lock_guard<std::mutex> lock(mutex_);
  auto it = stores_.find(key);
  if (it != stores_.end()) {
    return it->second;
  }
  return nullptr;
}

void BrownieStoreManager::removeStore(const std::string &key) {
  std::lock_guard<std::mutex> lock(mutex_);
  stores_.erase(key);
}

} // namespace brownie
