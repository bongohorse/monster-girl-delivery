import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bongohorse.monstergirldelivery',
  appName: 'MGD',
  webDir: 'dist',
  android: {
    appendUserAgent: 'MGD-Capacitor/1',
    backgroundColor: '#121426',
  },
};

export default config;
