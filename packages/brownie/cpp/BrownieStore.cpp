#include "BrownieStore.h"

namespace brownie {

BrownieStore::BrownieStore() : state_(folly::dynamic::object()) {}

BrownieStore::BrownieStore(folly::dynamic initialState)
    : state_(std::move(initialState)) {}

folly::dynamic BrownieStore::get(const std::string &key) const {
  std::lock_guard<std::mutex> lock(mutex_);
  if (state_.isObject() && state_.count(key)) {
    return state_[key];
  }
  return nullptr;
}

void BrownieStore::set(const std::string &key, folly::dynamic value) {
  ChangeCallback callback;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    if (!state_.isObject()) {
      state_ = folly::dynamic::object();
    }
    state_[key] = std::move(value);
    callback = changeCallback_;
  }

  if (callback) {
    callback();
  }
}

folly::dynamic BrownieStore::getSnapshot() const {
  std::lock_guard<std::mutex> lock(mutex_);
  return state_;
}

void BrownieStore::setState(folly::dynamic state) {
  ChangeCallback callback;
  {
    std::lock_guard<std::mutex> lock(mutex_);
    state_ = std::move(state);
    callback = changeCallback_;
  }

  if (callback) {
    callback();
  }
}

void BrownieStore::setChangeCallback(ChangeCallback callback) {
  std::lock_guard<std::mutex> lock(mutex_);
  changeCallback_ = std::move(callback);
}

} // namespace brownie
