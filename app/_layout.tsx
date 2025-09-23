import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme'
import { initDatabase } from '@/lib/db/sqlite';

export const unstable_settings = {
  anchor: '(tabs)',
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    async function initialize() {
      try {
        await initDatabase();
        setDbInitialized(true);
      } catch (e) {
        console.error("Failed to initialize database", e);
      }
    }
    initialize();
  }, []);

  if (!dbInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ headerShown: false }} />
        <Stack.Screen name="photo/[id]" options={{ title: 'Photo' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  )
}
