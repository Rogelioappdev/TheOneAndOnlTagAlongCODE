import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserProfile {
  // Basic Info
  name: string;
  age: number;
  profilePhotos: string[];
  country: string;
  city: string;
  gender: 'male' | 'female' | 'other' | null;
  bio: string;

  // Travel Preferences
  travelWith: 'male' | 'female' | 'everyone' | null;
  socialEnergy: 'introvert' | 'extrovert' | 'ambivert' | null;
  travelStyles: string[];
  travelPace: 'slow' | 'balanced' | 'fast' | null;
  groupType: 'close-knit' | 'open' | null;
  planningStyle: 'planner' | 'spontaneous' | 'flexible' | null;
  experience: 'beginner' | 'intermediate' | 'experienced' | 'expert' | null;

  // Places
  placesVisited: string[];
  bucketList: string[];
  languages: string[];

  // Identity
  zodiac:      string | null;
  mbti:        string | null;
  travelQuote: string | null;

  // Meta
  verified: boolean;
  createdAt: number;
  updatedAt: number;
}

interface UserProfileStore {
  profile: UserProfile | null;
  isLoaded: boolean;

  // Actions
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;

  // Travel Style Actions
  addTravelStyle: (style: string) => void;
  removeTravelStyle: (style: string) => void;
  setTravelPace: (pace: UserProfile['travelPace']) => void;
  setGroupType: (type: UserProfile['groupType']) => void;
  setPlanningStyle: (style: UserProfile['planningStyle']) => void;
  setSocialEnergy: (energy: UserProfile['socialEnergy']) => void;
  setExperience: (exp: UserProfile['experience']) => void;

  // Photo Actions
  addPhoto: (uri: string) => void;
  removePhoto: (uri: string) => void;
  reorderPhotos: (photos: string[]) => void;

  // Places Actions
  addPlaceVisited: (place: string) => void;
  removePlaceVisited: (place: string) => void;
  addToBucketList: (place: string) => void;
  removeFromBucketList: (place: string) => void;

  // Language Actions
  addLanguage: (lang: string) => void;
  removeLanguage: (lang: string) => void;
}

const useUserProfileStore = create<UserProfileStore>()(
  persist(
    (set, get) => ({
      profile: null,
      isLoaded: false,

      setProfile: (profile) => {
        set({ profile, isLoaded: true });
      },

      updateProfile: (updates) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            ...updates,
            updatedAt: Date.now(),
          },
        });
      },

      clearProfile: () => {
        set({ profile: null });
      },

      // Travel Style Actions
      addTravelStyle: (style) => {
        const current = get().profile;
        if (!current) return;
        if (current.travelStyles.includes(style)) return;
        set({
          profile: {
            ...current,
            travelStyles: [...current.travelStyles, style],
            updatedAt: Date.now(),
          },
        });
      },

      removeTravelStyle: (style) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            travelStyles: current.travelStyles.filter((s) => s !== style),
            updatedAt: Date.now(),
          },
        });
      },

      setTravelPace: (pace) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            travelPace: pace,
            updatedAt: Date.now(),
          },
        });
      },

      setGroupType: (type) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            groupType: type,
            updatedAt: Date.now(),
          },
        });
      },

      setPlanningStyle: (style) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            planningStyle: style,
            updatedAt: Date.now(),
          },
        });
      },

      setSocialEnergy: (energy) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            socialEnergy: energy,
            updatedAt: Date.now(),
          },
        });
      },

      setExperience: (exp) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            experience: exp,
            updatedAt: Date.now(),
          },
        });
      },

      // Photo Actions
      addPhoto: (uri) => {
        const current = get().profile;
        if (!current) return;
        if (current.profilePhotos.length >= 6) return;
        set({
          profile: {
            ...current,
            profilePhotos: [...current.profilePhotos, uri],
            updatedAt: Date.now(),
          },
        });
      },

      removePhoto: (uri) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            profilePhotos: current.profilePhotos.filter((p) => p !== uri),
            updatedAt: Date.now(),
          },
        });
      },

      reorderPhotos: (photos) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            profilePhotos: photos,
            updatedAt: Date.now(),
          },
        });
      },

      // Places Actions
      addPlaceVisited: (place) => {
        const current = get().profile;
        if (!current) return;
        if (current.placesVisited.includes(place)) return;
        set({
          profile: {
            ...current,
            placesVisited: [...current.placesVisited, place],
            updatedAt: Date.now(),
          },
        });
      },

      removePlaceVisited: (place) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            placesVisited: current.placesVisited.filter((p) => p !== place),
            updatedAt: Date.now(),
          },
        });
      },

      addToBucketList: (place) => {
        const current = get().profile;
        if (!current) return;
        if (current.bucketList.includes(place)) return;
        set({
          profile: {
            ...current,
            bucketList: [...current.bucketList, place],
            updatedAt: Date.now(),
          },
        });
      },

      removeFromBucketList: (place) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            bucketList: current.bucketList.filter((p) => p !== place),
            updatedAt: Date.now(),
          },
        });
      },

      // Language Actions
      addLanguage: (lang) => {
        const current = get().profile;
        if (!current) return;
        if (current.languages.includes(lang)) return;
        set({
          profile: {
            ...current,
            languages: [...current.languages, lang],
            updatedAt: Date.now(),
          },
        });
      },

      removeLanguage: (lang) => {
        const current = get().profile;
        if (!current) return;
        set({
          profile: {
            ...current,
            languages: current.languages.filter((l) => l !== lang),
            updatedAt: Date.now(),
          },
        });
      },
    }),
    {
      name: "user-profile-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoaded = true;
        }
      },
    }
  )
);

export default useUserProfileStore;
