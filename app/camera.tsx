import { CameraView, useCameraPermissions, CameraType, FlashMode } from "expo-camera";
import { useState, useRef } from "react";
import { Button, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";
import { saveImage } from "../lib/media/storage";
import { router } from "expo-router";
import { usePhotoStore } from "@/lib/stores/photo-store";
import { createPhoto } from "@/lib/data/photos";

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const { addPhoto } = usePhotoStore();

  if (!permission) {
    // Camera permissions are still loading
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  }

  function toggleFlash() {
    setFlash((current: FlashMode) => (current === 'off' ? 'on' : 'off'));
  }

  async function takePicture() {
    if (cameraRef.current && !isTakingPicture) {
      setIsTakingPicture(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 1, exif: true });
        if (photo) {
          const savedImage = await saveImage(photo.uri);
          const newPhoto = {
            id: savedImage.id,
            file_uri: savedImage.fileUri,
            thumbnail_uri: savedImage.thumbnailUri,
            taken_at: photo.exif?.DateTimeOriginal || new Date().toISOString(),
            width: savedImage.width,
            height: savedImage.height,
          };
          await createPhoto(newPhoto);
          addPhoto({ ...newPhoto, created_at: new Date().toISOString() });
          router.back();
        }
      } catch (error) {
        console.error('Failed to take and save picture', error);
        Alert.alert('Error', 'Failed to save the picture. Please try again.');
      } finally {
        setIsTakingPicture(false);
      }
    }
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} flash={flash} ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing} disabled={isTakingPicture}>
            <Text style={styles.text}>Flip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={toggleFlash} disabled={isTakingPicture}>
            <Text style={styles.text}>Flash</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={takePicture} disabled={isTakingPicture}>
            {isTakingPicture ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.text}>Take</Text>}
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "transparent",
    justifyContent: 'space-around',
    paddingBottom: 30,
    paddingTop: 20,
  },
  button: {
    alignItems: "center",
  },
  text: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
});
