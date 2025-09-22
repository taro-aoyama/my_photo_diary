/* eslint-disable no-console */
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import {
  saveImage,
  deleteImage,
  getUri,
  generateThumbnail,
} from "lib/media/storage";

// Mocking expo-file-system
jest.mock("expo-file-system");
jest.mock("expo-image-manipulator");

const mockFileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const mockImageManipulator = ImageManipulator as jest.Mocked<
  typeof ImageManipulator
>;

describe("lib/media/storage", () => {
  const PHOTOS_DIR = `${mockFileSystem.documentDirectory}photos/`;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock getInfoAsync to simulate that directories do not exist initially
    mockFileSystem.getInfoAsync.mockImplementation(async (uri) => {
      if (uri === PHOTOS_DIR || uri.startsWith(PHOTOS_DIR)) {
        return { exists: true, isDirectory: true, uri };
      }
      return { exists: false, isDirectory: false, uri };
    });

    // Mock makeDirectoryAsync
    mockFileSystem.makeDirectoryAsync.mockResolvedValue(undefined);

    // Mock copyAsync
    mockFileSystem.copyAsync.mockResolvedValue(undefined);

    // Mock deleteAsync
    mockFileSystem.deleteAsync.mockResolvedValue(undefined);

    // Mock ImageManipulator
    mockImageManipulator.manipulateAsync.mockResolvedValue({
      uri: "file:///manipulated.jpg",
      width: 200,
      height: 200,
      base64: null,
    });
  });

  describe("getUri", () => {
    it("should return the correct URI for a given file name", () => {
      const fileName = "test.jpg";
      const expectedUri = `${PHOTOS_DIR}${fileName}`;
      expect(getUri(fileName)).toBe(expectedUri);
    });
  });

  describe("saveImage", () => {
    it("should save an image and generate a thumbnail", async () => {
      const sourceUri = "file:///source.jpg";
      const result = await saveImage(sourceUri);

      expect(result.fileUri).toMatch(/^file:\/\/\/.*photos\/.*\.jpg$/);
      expect(result.thumbnailUri).toMatch(
        /^file:\/\/\/.*photos\/thumbnails\/.*_thumb\.jpg$/,
      );
      expect(mockFileSystem.copyAsync).toHaveBeenCalledWith({
        from: sourceUri,
        to: result.fileUri,
      });
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalled();
      expect(mockFileSystem.moveAsync).toHaveBeenCalled();
    });

    it("should throw an error if file copy/move fails", async () => {
      const sourceUri = "file:///source.jpg";
      mockFileSystem.copyAsync.mockRejectedValue(new Error("Copy failed"));
      mockFileSystem.moveAsync.mockRejectedValue(new Error("Move failed"));

      await expect(saveImage(sourceUri)).rejects.toThrow(
        "Failed to copy/move image to app storage",
      );
    });
  });

  describe("deleteImage", () => {
    it("should delete the photo and thumbnail", async () => {
      const photoUri = "file:///photo.jpg";
      const thumbnailUri = "file:///thumb.jpg";
      await deleteImage(photoUri, thumbnailUri);

      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(photoUri, {
        idempotent: false,
      });
      expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(thumbnailUri, {
        idempotent: false,
      });
    });

    it("should throw an error if photo deletion fails", async () => {
      const photoUri = "file:///photo.jpg";
      mockFileSystem.deleteAsync.mockRejectedValue(new Error("Delete failed"));

      await expect(deleteImage(photoUri)).rejects.toThrow(
        "Failed to delete photo file",
      );
    });
  });

  describe("generateThumbnail", () => {
    it("should generate a thumbnail and return its URI", async () => {
      const sourceUri = "file:///source.jpg";
      const thumbnailUri = await generateThumbnail(sourceUri);

      expect(thumbnailUri).toMatch(
        /^file:\/\/\/.*photos\/thumbnails\/.*_thumb\.jpg$/,
      );
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        sourceUri,
        [{ resize: { width: 200 } }],
        expect.any(Object),
      );
      expect(mockFileSystem.moveAsync).toHaveBeenCalled();
    });
  });
});
