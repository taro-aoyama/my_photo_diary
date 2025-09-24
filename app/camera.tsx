import {
  CameraView,
  useCameraPermissions,
  CameraType,
  FlashMode,
} from 'expo-camera'
import { useState, useRef, useCallback } from 'react'
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialIcons } from '@expo/vector-icons'
import { saveImage } from '../lib/media/storage'
import { router } from 'expo-router'
import { usePhotoStore } from '@/lib/stores/photo-store'
import { createPhoto } from '@/lib/data/photos'

export default function CameraScreen() {
  const [facing, setFacing] = useState<CameraType>('back')
  const [flash, setFlash] = useState<FlashMode>('off')
  const [zoom, setZoom] = useState<number>(0)
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)
  const [isTakingPicture, setIsTakingPicture] = useState(false)
  const { addPhoto } = usePhotoStore()
  const insets = useSafeAreaInsets()

  if (!permission) {
    // Camera permissions are still loading
    return <View />
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    )
  }

  function toggleCameraFacing() {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'))
  }

  function toggleFlash() {
    setFlash((current: FlashMode) => (current === 'off' ? 'on' : 'off'))
  }

  function increaseZoom() {
    setZoom((z) => Math.min(1, z + 0.1))
  }

  function decreaseZoom() {
    setZoom((z) => Math.max(0, z - 0.1))
  }

  async function takePicture() {
    if (cameraRef.current && !isTakingPicture) {
      setIsTakingPicture(true)
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          exif: true,
        })
        if (photo) {
          const savedImage = await saveImage(photo.uri)
          const newPhoto = {
            id: savedImage.id,
            file_uri: savedImage.fileUri,
            thumbnail_uri: savedImage.thumbnailUri,
            taken_at: photo.exif?.DateTimeOriginal || new Date().toISOString(),
            width: savedImage.width,
            height: savedImage.height,
          }
          await createPhoto(newPhoto)
          addPhoto({ ...newPhoto, created_at: new Date().toISOString() })
          router.back()
        }
      } catch (error) {
        console.error('Failed to take and save picture', error)
        Alert.alert('Error', 'Failed to save the picture. Please try again.')
      } finally {
        setIsTakingPicture(false)
      }
    }
  }

  return (
    <View style={styles.container}>
      {/* CameraView does not support children reliably in some runtimes (Expo CameraView).
          Render CameraView as a self-closing element and overlay controls absolutely. */}
      <CameraView
        style={styles.camera}
        facing={facing}
        flash={flash}
        ref={cameraRef}
      />

      {/* Controls overlay: positioned absolutely over the camera view so buttons are clickable */}
      <View
        style={[
          styles.controlsOverlay,
          { paddingBottom: Math.max(20, insets.bottom + 12) },
        ]}
        pointerEvents="box-none"
      >
        {/* Top-right flash control */}
        <View style={styles.topControls} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleFlash}
            disabled={isTakingPicture}
          >
            <MaterialIcons
              name={flash === 'on' ? 'flash-on' : 'flash-off'}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>

        {/* Bottom row: zoom out / shutter / zoom in */}
        <View style={styles.bottomControls} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.zoomButton, { zIndex: 100 }]}
            onPress={decreaseZoom}
            disabled={isTakingPicture}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            accessibilityRole="button"
          >
            <MaterialIcons name="zoom-out" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shutterWrapper, { zIndex: 200 }]}
            onPress={takePicture}
            disabled={isTakingPicture}
            activeOpacity={0.8}
            hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
            accessibilityRole="button"
          >
            <View style={styles.shutterOuter}>
              {isTakingPicture ? (
                <ActivityIndicator color="white" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.zoomButton, { zIndex: 100 }]}
            onPress={increaseZoom}
            disabled={isTakingPicture}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            accessibilityRole="button"
          >
            <MaterialIcons name="zoom-in" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  // Overlay that covers the camera area so controls can be positioned above it.
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // move controls up from the very bottom to avoid interfering with iOS home indicator
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    paddingBottom: 110,
  },

  // Top control row (flip, flash)
  topControls: {
    position: 'absolute',
    top: 12,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  // Bottom controls row (zoom -, shutter, zoom +)
  bottomControls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
    // ensure this sits above iOS home indicator
    paddingBottom: 20,
  },
  zoomButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  shutterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 78,
    borderWidth: 4,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 56,
    backgroundColor: 'white',
  },

  button: {
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
})
