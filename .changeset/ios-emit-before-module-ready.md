---
'@callstack/react-native-brownfield': patch
---

Fix an iOS crash (`std::bad_function_call`) when native code posts a message to JS before JS has loaded the Brownfield module. The message is now dropped with a log line instead.
