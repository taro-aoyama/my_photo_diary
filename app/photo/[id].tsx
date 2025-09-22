import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { useLocalSearchParams } from 'expo-router'
import { StyleSheet } from 'react-native'

export default function PhotoScreen() {
  const { id } = useLocalSearchParams()

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Photo {id}</ThemedText>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
