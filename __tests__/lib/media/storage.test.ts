/* eslint-disable no-console */
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import {
  saveImage,
  deleteImage,
  getUri,
  generateThumbnail,
} from "@/lib/media/storage";

// Mocking expo-file-system
jest.mock("expo-file-system", () => ({
  ...jest.requireActual("expo-file-system"),
  documentDirectory: "file:///mock-docs/",
  cacheDirectory: "file:///mock-cache/",
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
  moveAsync: jest.fn(),
}));
jest.mock("expo-image-manipulator");

const TypedFileSystem = FileSystem as unknown as {
  documentDirectory: string;
  cacheDirectory: string;
  getInfoAsync: jest.Mock;
  makeDirectoryAsync: jest.Mock;
  copyAsync: jest.Mock;
  deleteAsync: jest.Mock;
  moveAsync: jest.Mock;
};

const mockImageManipulator = ImageManipulator as jest.Mocked<
  typeof ImageManipulator
>;

describe("lib/media/storage", () => {
  const PHOTOS_DIR = `${TypedFileSystem.documentDirectory}photos/`;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock getInfoAsync to simulate that directories do not exist initially
    TypedFileSystem.getInfoAsync.mockImplementation(async (uri) => {
      if (
        uri === PHOTOS_DIR ||
        uri.startsWith(PHOTOS_DIR) ||
        uri.startsWith(`${TypedFileSystem.documentDirectory}photos/thumbnails`)
      ) {
        return {
          exists: true,
          isDirectory: true,
          uri,
          size: 1024,
          modificationTime: 1672531200,
        };
      }
      return {
        exists: false,
        isDirectory: false,
        uri,
        size: undefined,
        modificationTime: undefined,
      };
    });

    // Mock makeDirectoryAsync
    TypedFileSystem.makeDirectoryAsync.mockResolvedValue(undefined);

    // Mock copyAsync
    TypedFileSystem.copyAsync.mockResolvedValue(undefined);

    // Mock moveAsync
    TypedFileSystem.moveAsync.mockResolvedValue(undefined);

    // Mock deleteAsync
    TypedFileSystem.deleteAsync.mockResolvedValue(undefined);

    // Mock ImageManipulator
    mockImageManipulator.manipulateAsync.mockResolvedValue({
      uri: "file:///manipulated.jpg",
      width: 200,
      height: 200,
      base64: undefined,
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
      expect(TypedFileSystem.copyAsync).toHaveBeenCalledWith({
        from: sourceUri,
        to: result.fileUri,
      });
      expect(mockImageManipulator.manipulateAsync).toHaveBeenCalled();
      expect(TypedFileSystem.moveAsync).toHaveBeenCalled();
    });

    it("should throw an error if file copy/move fails", async () => {
      const sourceUri = "file:///source.jpg";
      TypedFileSystem.copyAsync.mockRejectedValue(new Error("Copy failed"));
      TypedFileSystem.moveAsync.mockRejectedValue(new Error("Move failed"));

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

      expect(TypedFileSystem.deleteAsync).toHaveBeenCalledWith(photoUri, {
        idempotent: false,
      });
      expect(TypedFileSystem.deleteAsync).toHaveBeenCalledWith(thumbnailUri, {
        idempotent: false,
      });
    });

    it("should throw an error if photo deletion fails", async () => {
      const photoUri = "file:///photo.jpg";
      TypedFileSystem.deleteAsync.mockRejectedValue(new Error("Delete failed"));

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
      expect(TypedFileSystem.moveAsync).toHaveBeenCalled();
    });
  });
});
