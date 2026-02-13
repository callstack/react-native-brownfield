# Patch by @hurali97, source: https://github.com/callstackincubator/rock/issues/492#issuecomment-3225109837
# Applicable only to Expo SDK versions prior to 55, which made ExpoModulesProvider internal by default: https://github.com/expo/expo/pull/42317
# Path to ExpoModulesProvider.swift
FILE="${SRCROOT}/Pods/Target Support Files/Pods-ExpoApp-{{FRAMEWORK_NAME}}/ExpoModulesProvider.swift"

if [ -f "$FILE" ]; then
  echo "Patching $FILE to hide Expo from public interface"

  # 1. Replace imports with internal imports
  sed -i '' 's/^import EX/internal import EX/' "$FILE"
  
  sed -i '' 's/^import Ex/internal import Ex/' "$FILE"

  # 2. Replace class visibility
  sed -i '' 's/public class ExpoModulesProvider/internal class ExpoModulesProvider/' "$FILE"

  echo "Patched $FILE to hide Expo from public interface"
  echo "Contents of $FILE:"
  cat "$FILE"
fi
