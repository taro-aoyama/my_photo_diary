/**
 * Root index screen
 *
 * このファイルは Expo Router のルート (`/`) にアクセスがあった際、
 * タブレイアウト `(tabs)` にリダイレクトするための最低限の画面です。
 *
 * - `router.replace('/albums')` を使って履歴を置き換える（戻るでこの画面に戻らないようにする）。
 * - ユーザーにわかりやすいようにローディング UI を表示する。
 */

import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import { router } from 'expo-router'

export default function Index() {
  useEffect(() => {
    // Replace current route with the albums screen so Expo Router has a matched route.
    // Using replace prevents the redirect page from staying in navigation history.
    router.replace('/albums')
  }, [])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Redirecting to app…</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#444',
  },
})
