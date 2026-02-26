#include <jni.h>
#include <folly/dynamic.h>
#include <folly/json.h>
#include <jsi/jsi.h>
#include <memory>
#include <mutex>
#include <string>
#include "BrownieInstaller.h"
#include "BrownieStore.h"
#include "BrownieStoreManager.h"

namespace {

constexpr auto kBridgeClassName = "com/callstack/brownie/BrownieStoreBridge";
constexpr auto kOnStoreDidChangeMethod = "onStoreDidChange";
constexpr auto kOnStoreDidChangeSignature = "(Ljava/lang/String;)V";

JavaVM *g_vm = nullptr;
jclass g_bridgeClass = nullptr;
jmethodID g_onStoreDidChangeMethod = nullptr;
std::once_flag g_initMethodOnce;

std::string fromJString(JNIEnv *env, jstring value) {
  if (value == nullptr) {
    return "";
  }

  const char *chars = env->GetStringUTFChars(value, nullptr);
  if (chars == nullptr) {
    return "";
  }

  std::string result(chars);
  env->ReleaseStringUTFChars(value, chars);
  return result;
}

jstring toJString(JNIEnv *env, const std::string &value) {
  return env->NewStringUTF(value.c_str());
}

bool initOnStoreDidChangeMethod(JNIEnv *env) {
  bool success = true;
  std::call_once(g_initMethodOnce, [env, &success]() {
    auto localBridgeClass = env->FindClass(kBridgeClassName);
    if (localBridgeClass == nullptr) {
      success = false;
      return;
    }

    g_bridgeClass = reinterpret_cast<jclass>(env->NewGlobalRef(localBridgeClass));
    env->DeleteLocalRef(localBridgeClass);
    if (g_bridgeClass == nullptr) {
      success = false;
      return;
    }

    g_onStoreDidChangeMethod = env->GetStaticMethodID(
        g_bridgeClass, kOnStoreDidChangeMethod, kOnStoreDidChangeSignature);
    if (g_onStoreDidChangeMethod == nullptr) {
      success = false;
    }
  });

  return success && g_bridgeClass != nullptr && g_onStoreDidChangeMethod != nullptr;
}

void emitStoreDidChange(const std::string &storeKey) {
  if (g_vm == nullptr) {
    return;
  }

  JNIEnv *env = nullptr;
  bool didAttachCurrentThread = false;

  if (g_vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6) != JNI_OK) {
    if (g_vm->AttachCurrentThread(&env, nullptr) != JNI_OK) {
      return;
    }
    didAttachCurrentThread = true;
  }

  if (!initOnStoreDidChangeMethod(env)) {
    if (didAttachCurrentThread) {
      g_vm->DetachCurrentThread();
    }
    return;
  }

  auto jStoreKey = toJString(env, storeKey);
  env->CallStaticVoidMethod(g_bridgeClass, g_onStoreDidChangeMethod, jStoreKey);
  env->DeleteLocalRef(jStoreKey);

  if (didAttachCurrentThread) {
    g_vm->DetachCurrentThread();
  }
}

std::shared_ptr<brownie::BrownieStore> getStoreOrNull(const std::string &storeKey) {
  return brownie::BrownieStoreManager::shared().getStore(storeKey);
}

template <typename TCallback>
void withStore(JNIEnv *env, jstring storeKey, TCallback &&callback) {
  auto store = getStoreOrNull(fromJString(env, storeKey));
  if (!store) {
    return;
  }

  callback(std::move(store));
}

template <typename TCallback>
jstring withStoreResult(JNIEnv *env, jstring storeKey, TCallback &&callback) {
  auto store = getStoreOrNull(fromJString(env, storeKey));
  if (!store) {
    return nullptr;
  }

  return callback(std::move(store));
}

template <typename TCallback>
void withParsedJson(const std::string &json, TCallback &&callback) {
  try {
    callback(folly::parseJson(json));
  } catch (const std::exception &) {
    // Keep native bridge resilient to malformed payloads from Kotlin callers.
  }
}

jstring toJsonJStringOrNull(JNIEnv *env, const folly::dynamic &value) {
  try {
    return toJString(env, folly::toJson(value));
  } catch (const std::exception &) {
    return nullptr;
  }
}

} // namespace

extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  g_vm = vm;
  return JNI_VERSION_1_6;
}

extern "C" JNIEXPORT void JNICALL
Java_com_callstack_brownie_BrownieStoreBridge_nativeInstallJSIBindings(JNIEnv *,
                                                                        jclass,
                                                                        jlong runtimePointer) {
  auto *runtime = reinterpret_cast<facebook::jsi::Runtime *>(runtimePointer);
  if (runtime == nullptr) {
    return;
  }

  brownie::BrownieInstaller::install(*runtime);
}

extern "C" JNIEXPORT void JNICALL
Java_com_callstack_brownie_BrownieStoreBridge_nativeRegisterStore(JNIEnv *env,
                                                                   jclass,
                                                                   jstring storeKey) {
  auto store = std::make_shared<brownie::BrownieStore>();
  auto key = fromJString(env, storeKey);
  store->setChangeCallback([key]() { emitStoreDidChange(key); });
  brownie::BrownieStoreManager::shared().registerStore(key, store);
}

extern "C" JNIEXPORT void JNICALL
Java_com_callstack_brownie_BrownieStoreBridge_nativeRemoveStore(JNIEnv *env,
                                                                 jclass,
                                                                 jstring storeKey) {
  brownie::BrownieStoreManager::shared().removeStore(fromJString(env, storeKey));
}

extern "C" JNIEXPORT void JNICALL
Java_com_callstack_brownie_BrownieStoreBridge_nativeSetValue(JNIEnv *env,
                                                              jclass,
                                                              jstring valueJson,
                                                              jstring propKey,
                                                              jstring storeKey) {
  withStore(env, storeKey, [env, propKey, valueJson](std::shared_ptr<brownie::BrownieStore> store) {
    auto key = fromJString(env, propKey);
    auto json = fromJString(env, valueJson);
    withParsedJson(json, [&store, &key](folly::dynamic value) { store->set(key, std::move(value)); });
  });
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_callstack_brownie_BrownieStoreBridge_nativeGetValue(JNIEnv *env,
                                                              jclass,
                                                              jstring propKey,
                                                              jstring storeKey) {
  return withStoreResult(env, storeKey, [env, propKey](std::shared_ptr<brownie::BrownieStore> store) {
    auto key = fromJString(env, propKey);
    return toJsonJStringOrNull(env, store->get(key));
  });
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_callstack_brownie_BrownieStoreBridge_nativeGetSnapshot(JNIEnv *env,
                                                                 jclass,
                                                                 jstring storeKey) {
  return withStoreResult(env, storeKey, [env](std::shared_ptr<brownie::BrownieStore> store) {
    return toJsonJStringOrNull(env, store->getSnapshot());
  });
}

extern "C" JNIEXPORT void JNICALL
Java_com_callstack_brownie_BrownieStoreBridge_nativeSetState(JNIEnv *env,
                                                              jclass,
                                                              jstring stateJson,
                                                              jstring storeKey) {
  withStore(env, storeKey, [env, stateJson](std::shared_ptr<brownie::BrownieStore> store) {
    auto json = fromJString(env, stateJson);
    withParsedJson(json, [&store](folly::dynamic state) { store->setState(std::move(state)); });
  });
}

extern "C" JNIEXPORT void JNICALL JNI_OnUnload(JavaVM *, void *) {
  if (g_vm == nullptr || g_bridgeClass == nullptr) {
    return;
  }

  JNIEnv *env = nullptr;
  if (g_vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6) != JNI_OK) {
    return;
  }

  env->DeleteGlobalRef(g_bridgeClass);
  g_bridgeClass = nullptr;
  g_onStoreDidChangeMethod = nullptr;
}
