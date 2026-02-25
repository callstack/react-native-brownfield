cmake_minimum_required(VERSION 3.13)

project(brownie)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(PACKAGE_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../..")

add_library(
  brownie
  SHARED
  JNIBrownieStoreBridge.cpp
  "${PACKAGE_ROOT}/cpp/BrownieHostObject.cpp"
  "${PACKAGE_ROOT}/cpp/BrownieInstaller.cpp"
  "${PACKAGE_ROOT}/cpp/BrownieStore.cpp"
  "${PACKAGE_ROOT}/cpp/BrownieStoreManager.cpp"
)

target_include_directories(
  brownie
  PRIVATE
  "${PACKAGE_ROOT}/cpp"
)

find_library(log-lib log)
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid QUIET CONFIG)

target_link_libraries(
  brownie
  PRIVATE
  ${log-lib}
  fbjni::fbjni
)

if(TARGET ReactAndroid::folly_runtime)
  target_link_libraries(brownie PRIVATE ReactAndroid::folly_runtime)
endif()

if(TARGET ReactAndroid::jsi)
  target_link_libraries(brownie PRIVATE ReactAndroid::jsi)
endif()
