#pragma once

#include "BrownieStore.h"
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>

namespace brownie {

class BrownieStoreManager {
public:
  static BrownieStoreManager &shared();

  void registerStore(const std::string &key,
                     std::shared_ptr<BrownieStore> store);
  std::shared_ptr<BrownieStore> getStore(const std::string &key) const;
  void removeStore(const std::string &key);

private:
  BrownieStoreManager() = default;
  mutable std::mutex mutex_;
  std::unordered_map<std::string, std::shared_ptr<BrownieStore>> stores_;
};

} // namespace brownie
