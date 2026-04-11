import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface TripPerson {
  id: string;
  name: string;
  age: number;
  image: string;
  photos: string[]; // all onboarding photos
  country: string;
  isHost: boolean;
  status: 'in' | 'maybe'; // Their status for this trip
}

export interface JoinedTrip {
  id: string;
  destination: string;
  country: string;
  image: string;
  dates: string;
  vibes: string[];
  description: string;
  fullDescription: string;
  host: string;
  budget: string;
  accommodation: string;
  groupSize: string;
  people: TripPerson[];
  userStatus: 'in' | 'maybe'; // Current user's status
  joinedAt: number;
  groupChatId?: string; // Reference to group chat
  isUserCreated?: boolean; // Whether this trip was created by the user
  dailyPace?: string;
  groupPreference?: string;
  maxPeople?: number;
}

interface TripsStore {
  joinedTrips: JoinedTrip[];

  // Actions
  joinTrip: (trip: Omit<JoinedTrip, 'userStatus' | 'joinedAt' | 'groupChatId'>, status: 'in' | 'maybe') => void;
  createTrip: (trip: Omit<JoinedTrip, 'id' | 'userStatus' | 'joinedAt' | 'groupChatId' | 'people' | 'isUserCreated'>) => void;
  updateTripStatus: (tripId: string, status: 'in' | 'maybe' | 'not_in') => void;
  setGroupChatId: (tripId: string, chatId: string) => void;
  getTripById: (tripId: string) => JoinedTrip | undefined;
  getTripsIn: () => JoinedTrip[];
  getTripsMaybe: () => JoinedTrip[];
  getUserCreatedTrips: () => JoinedTrip[];
  isAlreadyJoined: (tripId: string) => boolean;
  clearAll: () => void;
}

const useTripsStore = create<TripsStore>()(
  persist(
    (set, get) => ({
      joinedTrips: [],

      joinTrip: (trip, status) => {
        const existing = get().joinedTrips.find(t => t.id === trip.id);
        if (existing) return;

        // Add people with real status — don't fake random statuses
        const peopleWithStatus: TripPerson[] = trip.people.map(p => ({
          ...p,
          id: p.id || `person-${Math.random().toString(36).substr(2, 9)}`,
          photos: p.photos ?? [],
          status: 'in' as const,
        }));

        const newTrip: JoinedTrip = {
          ...trip,
          people: peopleWithStatus,
          userStatus: status,
          joinedAt: Date.now(),
        };

        set({ joinedTrips: [...get().joinedTrips, newTrip] });
      },

      createTrip: (trip) => {
        const newTrip: JoinedTrip = {
          ...trip,
          id: `user-trip-${Date.now()}`,
          people: [], // User created trips start with no other people
          userStatus: 'in', // User is automatically "in" for their own trip
          joinedAt: Date.now(),
          isUserCreated: true,
        };

        set({ joinedTrips: [...get().joinedTrips, newTrip] });
      },

      updateTripStatus: (tripId, status) => {
        if (status === 'not_in') {
          // Remove trip entirely
          set({
            joinedTrips: get().joinedTrips.filter(t => t.id !== tripId),
          });
        } else {
          // Update status
          set({
            joinedTrips: get().joinedTrips.map(t =>
              t.id === tripId ? { ...t, userStatus: status } : t
            ),
          });
        }
      },

      setGroupChatId: (tripId, chatId) => {
        set({
          joinedTrips: get().joinedTrips.map(t =>
            t.id === tripId ? { ...t, groupChatId: chatId } : t
          ),
        });
      },

      getTripById: (tripId) => {
        return get().joinedTrips.find(t => t.id === tripId);
      },

      getTripsIn: () => {
        return get().joinedTrips.filter(t => t.userStatus === 'in');
      },

      getTripsMaybe: () => {
        return get().joinedTrips.filter(t => t.userStatus === 'maybe');
      },

      getUserCreatedTrips: () => {
        return get().joinedTrips.filter(t => t.isUserCreated === true);
      },

      isAlreadyJoined: (tripId) => {
        return get().joinedTrips.some(t => t.id === tripId);
      },

      clearAll: () => {
        set({ joinedTrips: [] });
      },
    }),
    {
      name: "trips-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useTripsStore;