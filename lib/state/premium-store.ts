import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SubscriptionPlan = 'weekly' | 'monthly' | 'yearly';

interface PremiumState {
  isPremium: boolean;
  subscriptionPlan: SubscriptionPlan | null;
  subscribedAt: number | null; // timestamp
  hasSeenProfilePaywall: boolean; // tracks if paywall shown on first profile tab visit
}

interface PremiumActions {
  setPremium: (plan: SubscriptionPlan) => void;
  removePremium: () => void;
  markProfilePaywallSeen: () => void;
}

type PremiumStore = PremiumState & PremiumActions;

const usePremiumStore = create<PremiumStore>()(
  persist(
    (set) => ({
      // State
      isPremium: false,
      subscriptionPlan: null,
      subscribedAt: null,
      hasSeenProfilePaywall: false,

      // Actions
      setPremium: (plan: SubscriptionPlan) =>
        set({
          isPremium: true,
          subscriptionPlan: plan,
          subscribedAt: Date.now(),
        }),

      removePremium: () =>
        set({
          isPremium: false,
          subscriptionPlan: null,
          subscribedAt: null,
        }),

      markProfilePaywallSeen: () =>
        set({ hasSeenProfilePaywall: true }),
    }),
    {
      name: "premium-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default usePremiumStore;
