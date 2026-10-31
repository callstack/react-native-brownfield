---
'@callstack/react-native-brownfield': patch
---

Fix an iOS crash (`std::bad_function_call`) when native code posts a message to JS while the Brownfield module's JS emitter is still being set up. If the Brownfield module exists but its JS emitter is not ready when delivery happens, the message is dropped and a log line is written. If the module does not exist yet, the message is dropped without a log line.
