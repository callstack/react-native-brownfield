import HomeScreen from '@callstack/shared-runtime/expo/app/home';
import LottieView from 'lottie-react-native';

export default function Index() {
  return (
    <>
      {/* Keep Lottie's Android artifact in the generated brownfield POM. */}
      <LottieView
        source={{ v: '5.7.4', fr: 30, ip: 0, op: 1, w: 1, h: 1, layers: [] }}
        style={{ position: 'absolute', width: 1, height: 1 }}
      />
      <HomeScreen sdkVersion={57} />
    </>
  );
}
