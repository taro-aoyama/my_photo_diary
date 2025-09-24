import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { useColorScheme } from '@/hooks/use-color-scheme'
import { initDatabase } from '@/lib/db'

export const unstable_settings = {
  anchor: '(tabs)',
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [dbInitialized, setDbInitialized] = useState(false)

  useEffect(() => {
    async function initialize() {
      try {
        await initDatabase()
      } catch (e) {
        // Initialization failed — treat as non-fatal for UI development so the app can continue.
        // Log a warning with structured info to make debugging easier in development.
        // eslint-disable-next-line no-console
        console.warn(
          'DB init failed (continuing without DB). Check logs for details:',
          e && (e as any).message ? (e as any).message : e,
        )
      } finally {
        // Ensure we always resolve loading state so the UI appears even if DB fails.
        setDbInitialized(true)
      }
    }
    initialize()
  }, [])

  if (!dbInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
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
