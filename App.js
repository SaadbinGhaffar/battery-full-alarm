import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { VT323_400Regular } from '@expo-google-fonts/vt323';

import { SettingsProvider } from './src/hooks/useSettings';
import { AlarmProvider } from './src/providers/AlarmProvider';
import { AdsProvider } from './src/ads/AdsProvider';
import HomeScreen from './src/screens/HomeScreen';

// Keep the splash up until the retro fonts are ready (no unstyled flash).
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ PressStart2P_400Regular, VT323_400Regular });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <AdsProvider>
        <SettingsProvider>
          <AlarmProvider>
            <HomeScreen />
          </AlarmProvider>
        </SettingsProvider>
      </AdsProvider>
    </SafeAreaProvider>
  );
}
