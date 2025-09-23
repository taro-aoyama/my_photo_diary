import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePhotoStore } from '@/lib/stores/photo-store';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Image, View } from 'react-native';

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams();
  const { photos } = usePhotoStore();
  const photo = photos.find((p) => p.id === id);

  if (!photo) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Photo not found.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Image source={{ uri: photo.file_uri }} style={styles.image} />
      <View style={styles.metaContainer}>
        <ThemedText type="subtitle">Details</ThemedText>
        <ThemedText>ID: {photo.id}</ThemedText>
        <ThemedText>Taken at: {photo.taken_at ? new Date(photo.taken_at).toLocaleString() : 'N/A'}</ThemedText>
        <ThemedText>Created at: {new Date(photo.created_at).toLocaleString()}</ThemedText>
        {photo.width && photo.height && (
          <ThemedText>Dimensions: {photo.width}x{photo.height}</ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  metaContainer: {
    alignSelf: 'flex-start',
  }
});
