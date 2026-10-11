import type { ExpoConfig } from 'expo/config';

// App name, bundle IDs and colours are placeholders until the brand is chosen.
const config: ExpoConfig = {
  name: 'IELTS Path',
  slug: 'ielts-path',
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
  },
  plugins: ['expo-router', 'expo-apple-authentication'],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
