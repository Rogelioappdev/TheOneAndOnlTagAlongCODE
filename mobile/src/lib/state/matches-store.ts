import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface MatchedTraveler {
  id: string;
  name: string;
  age: number;
  image: string;
  photos: string[]; // all onboarding photos
  country: string;
  city: string;
  travelStyles: string[];
  vibes: string[];
  destinations: string[];
  bio: string;
  fullBio: string;
  languages: string[];
  availability: string;
  instagram: string;
  placesVisited: string[];
  likedAt: number; // timestamp when user liked
  isMutual: boolean; // whether they liked back
}

interface MatchesStore {
  requests: MatchedTraveler[]; // people you liked but haven't liked you back
  mutual: MatchedTraveler[]; // people who liked you back
  addToRequests: (traveler: Omit<MatchedTraveler, 'likedAt' | 'isMutual'>, onMatch?: (traveler: MatchedTraveler) => void) => void;
  moveToMutual: (travelerId: string) => void;
  removeMatch: (travelerId: string) => void;
  isAlreadyLiked: (travelerId: string) => boolean;
  clearAll: () => void;
}

const useMatchesStore = create<MatchesStore>()(
  persist(
    (set, get) => ({
      requests: [],
      mutual: [],

      addToRequests: (traveler, onMatch) => {
        const existing = get().requests.find(t => t.id === traveler.id) ||
                         get().mutual.find(t => t.id === traveler.id);
        if (existing) return; // Already liked

        // Always add to requests — real mutual match status comes from
        // Supabase (swipeRPCMutation) and useRealtimeNewMutualMatch.
        // The old Math.random() simulation here was causing fake matches
        // to appear locally that didn't reflect actual DB state.
        const newMatch: MatchedTraveler = {
          ...traveler,
          likedAt: Date.now(),
          isMutual: false,
        };
        set({ requests: [...get().requests, newMatch] });
      },

      moveToMutual: (travelerId) => {
        const traveler = get().requests.find(t => t.id === travelerId);
        if (!traveler) return;

        set({
          requests: get().requests.filter(t => t.id !== travelerId),
          mutual: [...get().mutual, { ...traveler, isMutual: true }],
        });
      },

      removeMatch: (travelerId) => {
        set({
          requests: get().requests.filter(t => t.id !== travelerId),
          mutual: get().mutual.filter(t => t.id !== travelerId),
        });
      },

      isAlreadyLiked: (travelerId) => {
        return get().requests.some(t => t.id === travelerId) ||
               get().mutual.some(t => t.id === travelerId);
      },

      clearAll: () => {
        set({ requests: [], mutual: [] });
      },
    }),
    {
      name: "matches-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useMatchesStore;