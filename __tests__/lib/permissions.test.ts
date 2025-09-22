import { requestPermission } from "@/lib/permissions";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  PermissionStatus: {
    GRANTED: "granted",
    DENIED: "denied",
    UNDETERMINED: "undetermined",
  },
}));

jest.spyOn(Alert, "alert");

describe("requestPermission", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return true if camera permission is granted", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      status: ImagePicker.PermissionStatus.GRANTED,
    });
    const result = await requestPermission("camera");
    expect(result).toBe(true);
  });

  it("should return false and show alert if camera permission is denied", async () => {
    (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
      status: ImagePicker.PermissionStatus.DENIED,
    });
    const result = await requestPermission("camera");
    expect(result).toBe(false);
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("should return true if media library permission is granted", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({
      status: ImagePicker.PermissionStatus.GRANTED,
    });
    const result = await requestPermission("media");
    expect(result).toBe(true);
  });

  it("should return false and show alert if media library permission is denied", async () => {
    (
      ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock
    ).mockResolvedValue({
      status: ImagePicker.PermissionStatus.DENIED,
    });
    const result = await requestPermission("media");
    expect(result).toBe(false);
    expect(Alert.alert).toHaveBeenCalled();
  });
});
