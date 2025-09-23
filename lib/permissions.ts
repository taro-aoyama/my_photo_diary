import { Alert, Linking, Platform } from "react-native";
import {
  PermissionStatus,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";

type PermissionType = "camera" | "media";

const openSettings = () => {
  Linking.openSettings();
};

const showPermissionDeniedAlert = (permissionType: PermissionType) => {
  const message =
    permissionType === "camera"
      ? "Camera permission is required to take photos."
      : "Media library permission is required to select photos.";

  Alert.alert(
    "Permission Denied",
    message,
    [
      { text: "Cancel", style: "cancel" },
      { text: "Open Settings", onPress: openSettings },
    ],
    { cancelable: false }
  );
};

export const requestPermission = async (
  permissionType: PermissionType
): Promise<boolean> => {
  let permission;
  if (permissionType === "camera") {
    permission = await requestCameraPermissionsAsync();
  } else {
    permission = await requestMediaLibraryPermissionsAsync();
  }

  if (permission.status === PermissionStatus.DENIED) {
    showPermissionDeniedAlert(permissionType);
    return false;
  }

  if (permission.status === PermissionStatus.UNDETERMINED) {
    const newPermission =
      permissionType === "camera"
        ? await requestCameraPermissionsAsync()
        : await requestMediaLibraryPermissionsAsync();
    if (newPermission.status === PermissionStatus.DENIED) {
      showPermissionDeniedAlert(permissionType);
      return false;
    }
  }
  return true;
};
