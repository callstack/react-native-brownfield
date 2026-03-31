cmake_minimum_required(VERSION 3.13)

project(brownie)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(PACKAGE_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../..")

SET(folly_FLAGS
        -DFOLLY_NO_CONFIG=1
        -DFOLLY_HAVE_CLOCK_GETTIME=1
        -DFOLLY_USE_LIBCPP=1
        -DFOLLY_CFG_NO_COROUTINES=1
        -DFOLLY_MOBILE=1
        -DFOLLY_HAVE_RECVMMSG=1
        -DFOLLY_HAVE_PTHREAD=1
        # Once we target android-23 above, we can comment
        # the following line. NDK uses GNU style stderror_r() after API 23.
        -DFOLLY_HAVE_XSI_STRERROR_R=1
        )

add_compile_options(${folly_FLAGS})

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
find_package(ReactAndroid REQUIRED CONFIG)

target_link_libraries(
  brownie
  PRIVATE
  ${log-lib}
  fbjni::fbjni
)


if(TARGET ReactAndroid::jsi)
  target_link_libraries(brownie PRIVATE ReactAndroid::jsi)
elseif(TARGET jsi)
  target_link_libraries(brownie PRIVATE jsi)
endif()

if(TARGET ReactAndroid::reactnative)
  target_link_libraries(brownie PRIVATE ReactAndroid::reactnative)
endif()

if(TARGET ReactAndroid::folly_runtime)
  target_link_libraries(brownie PRIVATE ReactAndroid::folly_runtime)
elseif(TARGET folly_runtime)
  target_link_libraries(brownie PRIVATE folly_runtime)
endif()

