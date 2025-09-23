import { ThemedText } from '@/components/themed-text'
import { ThemedView } from '@/components/themed-view'
import { Link } from 'expo-router'
import { Button, StyleSheet, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { requestPermission } from '@/lib/permissions'
import { saveImage } from '@/lib/media/storage'

export default function AlbumsScreen() {
  const pickImage = async () => {
    const hasPermission = await requestPermission('media')
    if (!hasPermission) {
      return
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
      exif: true,
    })

    if (!result.canceled) {
      const savedImage = await saveImage(result.assets[0].uri)
      console.log('Image saved:', savedImage)
      console.log('Exif data:', result.assets[0].exif)
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Albums</ThemedText>
      <View style={styles.buttonContainer}>
        <Link href="/camera" asChild>
          <Button title="Open Camera" />
        </Link>
        <Button title="Pick an image from camera roll" onPress={pickImage} />
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 10,
  }
})
