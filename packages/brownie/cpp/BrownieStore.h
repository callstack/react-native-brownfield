#pragma once

#include <folly/dynamic.h>
#include <functional>
#include <mutex>
#include <string>

namespace brownie {

class BrownieStore {
public:
  using ChangeCallback = std::function<void()>;

  BrownieStore();
  explicit BrownieStore(folly::dynamic initialState);

  folly::dynamic get(const std::string &key) const;
  void set(const std::string &key, folly::dynamic value);
  folly::dynamic getSnapshot() const;
  void setState(folly::dynamic state);

  void setChangeCallback(ChangeCallback callback);

private:
  mutable std::mutex mutex_;
  folly::dynamic state_;
  ChangeCallback changeCallback_;
};

} // namespace brownie
