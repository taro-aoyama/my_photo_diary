import { create } from 'zustand';
import { Photo, getPhotos } from '@/lib/data/photos';

type PhotoState = {
  photos: Photo[];
  isLoading: boolean;
  fetchPhotos: () => Promise<void>;
  addPhoto: (photo: Photo) => void;
};

export const usePhotoStore = create<PhotoState>((set) => ({
  photos: [],
  isLoading: false,
  fetchPhotos: async () => {
    set({ isLoading: true });
    try {
      const photos = await getPhotos();
      set({ photos, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch photos', error);
      set({ isLoading: false });
    }
  },
  addPhoto: (photo) => {
    set((state) => ({
      photos: [photo, ...state.photos],
    }));
  },
}));
