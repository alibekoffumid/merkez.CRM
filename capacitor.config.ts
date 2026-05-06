import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.merkez.scanner',
  appName: 'Merkez Scanner',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1023780426995-cf4l1e22s69kdroatndm4qf617sj8giv.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
