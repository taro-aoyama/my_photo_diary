import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import { Button, StyleSheet, View, FlatList, Image, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { requestPermission } from '@/lib/permissions';
import { saveImage } from '@/lib/media/storage';
import { usePhotoStore } from '@/lib/stores/photo-store';
import { useEffect, useState } from 'react';
import { createPhoto } from '@/lib/data/photos';

export default function AlbumsScreen() {
  const { photos, fetchPhotos, addPhoto, isLoading: isLoadingPhotos } = usePhotoStore();
  const [isPicking, setIsPicking] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const pickImage = async () => {
    const hasPermission = await requestPermission('media');
    if (!hasPermission) {
      Alert.alert('Permission required', 'We need permission to access your photos.');
      return;
    }

    setIsPicking(true);
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        exif: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const savedImage = await saveImage(asset.uri);
        const newPhoto = {
          id: savedImage.id,
          file_uri: savedImage.fileUri,
          thumbnail_uri: savedImage.thumbnailUri,
          taken_at: asset.exif?.DateTimeOriginal || new Date().toISOString(),
          width: savedImage.width,
          height: savedImage.height,
        };
        await createPhoto(newPhoto);
        addPhoto({ ...newPhoto, created_at: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Failed to pick and save image', error);
      Alert.alert('Error', 'Failed to save the image. Please try again.');
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Albums</ThemedText>
        <View style={styles.buttonContainer}>
          <Link href="/camera" asChild>
            <Button title="Open Camera" disabled={isPicking} />
          </Link>
          <Button title="Pick an image" onPress={pickImage} disabled={isPicking} />
        </View>
      </View>
      {(isLoadingPhotos || isPicking) && <ActivityIndicator size="large" color="#0000ff" />}
      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <Link href={`/photo/${item.id}`} asChild>
            <TouchableOpacity>
              <Image source={{ uri: item.thumbnail_uri || item.file_uri }} style={styles.thumbnail} />
            </TouchableOpacity>
          </Link>
        )}
        contentContainerStyle={styles.list}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  buttonContainer: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  list: {
    justifyContent: 'flex-start',
  },
  thumbnail: {
    width: 120,
    height: 120,
    margin: 2,
  },
});
