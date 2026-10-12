import type { NextConfig } from 'next';

const config: NextConfig = {
  // Shared code is TypeScript source, compiled by Next like the app's own files.
  transpilePackages: ['@ielts/shared'],
};

export default config;
