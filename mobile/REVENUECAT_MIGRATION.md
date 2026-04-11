# Connecting RevenueCat to Existing Premium System

This guide shows how to integrate RevenueCat with your existing Tag-Along+ premium system.

## Current Premium System

Your app already has a premium system in place:
- `src/lib/state/premium-store.ts` - Zustand store managing premium status
- `src/components/PremiumPaywall.tsx` - Existing paywall UI with subscription plans
- Swipe limit system that checks premium status

## Integration Steps

### 1. Update Premium Store to Use RevenueCat

Replace the mock premium store with real RevenueCat data:

```typescript
// src/lib/state/premium-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasPremiumAccess } from '@/lib/revenuecatConfig';

interface PremiumState {
  isPremium: boolean;
  subscriptionPlan: 'weekly' | 'monthly' | 'yearly' | null;
  subscriptionStartDate: string | null;
  checkPremiumStatus: () => Promise<void>;
  activatePremium: (plan: 'weekly' | 'monthly' | 'yearly') => void;
  deactivatePremium: () => void;
}

export const usePremiumStore = create<PremiumState>()(
  persist(
    (set, get) => ({
      isPremium: false,
      subscriptionPlan: null,
      subscriptionStartDate: null,

      // Check premium status from RevenueCat
      checkPremiumStatus: async () => {
        try {
          const isPremium = await hasPremiumAccess();
          set({ isPremium });
        } catch (error) {
          console.error('Error checking premium status:', error);
        }
      },

      activatePremium: (plan) => {
        set({
          isPremium: true,
          subscriptionPlan: plan,
          subscriptionStartDate: new Date().toISOString(),
        });
      },

      deactivatePremium: () => {
        set({
          isPremium: false,
          subscriptionPlan: null,
          subscriptionStartDate: null,
        });
      },
    }),
    {
      name: 'premium-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

### 2. Sync Premium Status on App Start

Update `src/app/_layout.tsx` to sync premium status:

```typescript
// In the checkAuth useEffect
useEffect(() => {
  const checkAuth = async () => {
    try {
      await initializeRevenueCat();

      const authenticated = await isAuthenticated();

      if (authenticated) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await setRevenueCatUserId(user.id);

          // Sync premium status from RevenueCat
          const premiumStore = usePremiumStore.getState();
          await premiumStore.checkPremiumStatus();
        }
      }

      // ... rest of code
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  checkAuth();
}, []);
```

### 3. Replace Existing Paywall with RevenueCat Paywall

Option A: Keep your existing PremiumPaywall design but wire it to RevenueCat:

```typescript
// In your existing PremiumPaywall component
import { usePurchasePackage, useOfferings } from '@/lib/hooks/useRevenueCat';

function PremiumPaywall({ visible, onClose }) {
  const { data: offering } = useOfferings();
  const purchaseMutation = usePurchasePackage();

  const handlePurchase = async (plan: 'weekly' | 'monthly' | 'yearly') => {
    if (!offering) return;

    // Find the package that matches the plan
    const packageToPurchase = offering.availablePackages.find(
      pkg => pkg.product.identifier === plan
    );

    if (packageToPurchase) {
      try {
        const result = await purchaseMutation.mutateAsync(packageToPurchase);

        if (result.success) {
          // Sync with premium store
          usePremiumStore.getState().activatePremium(plan);
          onClose();
        }
      } catch (error) {
        console.error('Purchase failed:', error);
      }
    }
  };

  // Rest of your existing UI
}
```

Option B: Replace with the new RevenueCat Paywall component:

```typescript
// Replace all instances of <PremiumPaywall /> with <Paywall />
import { Paywall } from '@/components/Paywall';

<Paywall
  visible={showPaywall}
  onClose={() => setShowPaywall(false)}
  onPurchaseSuccess={() => {
    // Refresh premium status
    usePremiumStore.getState().checkPremiumStatus();
  }}
/>
```

### 4. Update Swipe Limit Check

Ensure swipe limit checks premium status from RevenueCat:

```typescript
// src/lib/state/swipe-limit-store.ts
import { usePremiumStore } from './premium-store';

// In canSwipe() method:
canSwipe: () => {
  const { isPremium } = usePremiumStore.getState();

  // Premium users have unlimited swipes
  if (isPremium) return true;

  // Rest of your existing logic...
}
```

### 5. Add Subscription Management to Settings

Add a "Manage Subscription" button to your Profile tab:

```typescript
// In src/app/(tabs)/profile.tsx
import { CustomerCenter } from '@/components/CustomerCenter';
import { usePremium } from '@/components/PremiumGate';

function ProfileScreen() {
  const { isPremium } = usePremium();
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);

  return (
    <View>
      {/* Your existing profile UI */}

      {isPremium && (
        <Pressable onPress={() => setShowCustomerCenter(true)}>
          <Text>Manage Subscription</Text>
        </Pressable>
      )}

      <CustomerCenter
        visible={showCustomerCenter}
        onClose={() => setShowCustomerCenter(false)}
      />
    </View>
  );
}
```

## Testing Checklist

- [ ] Premium status syncs on app start
- [ ] Paywall shows available subscription plans
- [ ] Purchase flow completes successfully
- [ ] Premium status updates immediately after purchase
- [ ] Swipe limits removed for premium users
- [ ] Restore purchases works correctly
- [ ] Customer Center allows subscription management
- [ ] Logout clears RevenueCat user ID

## Next Steps

1. **Configure RevenueCat Dashboard:**
   - Create products: `weekly`, `monthly`, `yearly`, `lifetime`
   - Set up offerings and pricing
   - Configure `TagAlong+` entitlement
   - Link to App Store Connect / Google Play Console

2. **Test with Sandbox:**
   - Create test user in App Store Connect
   - Test purchase flow end-to-end
   - Test restore purchases
   - Test subscription expiration

3. **Production:**
   - Replace test API key with production key
   - Test in TestFlight/Internal Testing
   - Submit for app review

## Migration Notes

- Existing premium users will need to re-purchase (this is a new system)
- Consider offering promotional codes for existing users
- Update terms of service and privacy policy
- Add subscription disclosure text as required by app stores

## Support

See `REVENUECAT_INTEGRATION.md` for full documentation on all RevenueCat features.
