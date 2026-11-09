import type { ExpoConfig } from 'expo/config';

// IELTS PATH branding. Path Blue #2F62E9 is the brand colour (see src/theme/tokens.ts).
// Still to be designed and added before a store build (none exist in assets/ yet):
//   icon            assets/icon.png            1024×1024 PNG, no transparency (iOS)
//   adaptiveIcon    assets/adaptive-icon.png   1024×1024 foreground, background #2F62E9
//   splash          assets/splash-icon.png     via the expo-splash-screen plugin
// Until then Expo uses its default icon and a plain splash.
const BRAND_BLUE = '#2F62E9';

const config: ExpoConfig = {
  name: 'IELTS PATH',
  slug: 'ielts-path',
  primaryColor: BRAND_BLUE,
  scheme: 'ieltsapp',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.ieltspath.app',
    supportsTablet: true,
    usesAppleSignIn: true,
  },
  android: {
    package: 'com.ieltspath.app',
  },
  web: {
    bundler: 'metro',
    output: 'single',
    themeColor: BRAND_BLUE,
  },
  plugins: ['expo-router', 'expo-apple-authentication'],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
