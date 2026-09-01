import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'it.edilristrutturazioni.app',
  appName: 'Edilristrutturazioni',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
