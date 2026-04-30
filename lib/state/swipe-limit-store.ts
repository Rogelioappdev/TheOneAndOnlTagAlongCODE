import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DAILY_SWIPE_LIMIT = 10;
const RESET_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface SwipeLimitState {
  dailySwipesUsed: number;
  swipeLimitStartTimestamp: number | null; // When the first swipe of the day occurred
}

interface SwipeLimitActions {
  recordSwipe: () => boolean; // Returns true if swipe allowed, false if limit reached
  canSwipe: () => boolean;
  getSwipesRemaining: () => number;
  getResetTimestamp: () => number | null; // Returns when swipes will reset (null if no limit active)
  resetSwipesIfNeeded: () => void; // Check and reset if 24h passed
  forceReset: () => void; // For testing or manual reset
}

type SwipeLimitStore = SwipeLimitState & SwipeLimitActions;

const useSwipeLimitStore = create<SwipeLimitStore>()(
  persist(
    (set, get) => ({
      // State
      dailySwipesUsed: 0,
      swipeLimitStartTimestamp: null,

      // Actions
      recordSwipe: () => {
        const state = get();
        const now = Date.now();

        // Check if we need to reset first
        if (
          state.swipeLimitStartTimestamp &&
          now - state.swipeLimitStartTimestamp >= RESET_PERIOD_MS
        ) {
          // Reset and allow this swipe
          set({
            dailySwipesUsed: 1,
            swipeLimitStartTimestamp: now,
          });
          return true;
        }

        // If we've hit the limit, don't allow
        if (state.dailySwipesUsed >= DAILY_SWIPE_LIMIT) {
          return false;
        }

        // First swipe of the day - start the timer
        if (state.swipeLimitStartTimestamp === null) {
          set({
            dailySwipesUsed: 1,
            swipeLimitStartTimestamp: now,
          });
          return true;
        }

        // Regular swipe - increment counter
        set({
          dailySwipesUsed: state.dailySwipesUsed + 1,
        });
        return true;
      },

      canSwipe: () => {
        const state = get();
        const now = Date.now();

        // If timer expired, can swipe
        if (
          state.swipeLimitStartTimestamp &&
          now - state.swipeLimitStartTimestamp >= RESET_PERIOD_MS
        ) {
          return true;
        }

        return state.dailySwipesUsed < DAILY_SWIPE_LIMIT;
      },

      getSwipesRemaining: () => {
        const state = get();
        const now = Date.now();

        // If timer expired, full swipes available
        if (
          state.swipeLimitStartTimestamp &&
          now - state.swipeLimitStartTimestamp >= RESET_PERIOD_MS
        ) {
          return DAILY_SWIPE_LIMIT;
        }

        return Math.max(0, DAILY_SWIPE_LIMIT - state.dailySwipesUsed);
      },

      getResetTimestamp: () => {
        const state = get();

        if (state.swipeLimitStartTimestamp === null) {
          return null;
        }

        return state.swipeLimitStartTimestamp + RESET_PERIOD_MS;
      },

      resetSwipesIfNeeded: () => {
        const state = get();
        const now = Date.now();

        if (
          state.swipeLimitStartTimestamp &&
          now - state.swipeLimitStartTimestamp >= RESET_PERIOD_MS
        ) {
          set({
            dailySwipesUsed: 0,
            swipeLimitStartTimestamp: null,
          });
        }
      },

      forceReset: () => {
        set({
          dailySwipesUsed: 0,
          swipeLimitStartTimestamp: null,
        });
      },
    }),
    {
      name: "swipe-limit-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export { DAILY_SWIPE_LIMIT };
export default useSwipeLimitStore;
