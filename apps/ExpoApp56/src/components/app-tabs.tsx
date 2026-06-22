import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';
import { brownfieldE2ETestIds } from '@callstack/brownfield-example-shared-tests/e2eTestIds';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger
        name="index"
        unstable_nativeProps={{
          tabBarItemTestID: brownfieldE2ETestIds.expoHomeTab,
          tabBarItemAccessibilityLabel: 'Home',
        }}>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger
        name="postMessage"
        unstable_nativeProps={{
          tabBarItemTestID: brownfieldE2ETestIds.expoPostMessageTab,
          tabBarItemAccessibilityLabel: 'postMessage API',
        }}>
        <NativeTabs.Trigger.Label>postMessage API</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="message" sf="message.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
