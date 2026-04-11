# RevenueCat Integration Guide

This document explains how to use RevenueCat in your TagAlong app for subscription management.

## 📦 What's Installed

- `react-native-purchases` - Core RevenueCat SDK
- `react-native-purchases-ui` - Pre-built Paywall & Customer Center UI

## 🔧 Configuration

### API Key
Your RevenueCat API key is configured in `src/lib/revenuecatConfig.ts`:
```typescript
const REVENUECAT_API_KEY = 'test_foHAKuGLQtHkDyVKFNAJyFAukHK';
```

### Entitlement
The premium entitlement is named `TagAlong+`

### Product IDs
Three subscription tiers are supported:
- `monthly` - Monthly subscription
- `yearly` - Yearly subscription
- `lifetime` - Lifetime purchase

## 🚀 How It Works

### 1. **Initialization**
RevenueCat is automatically initialized in `src/app/_layout.tsx` when the app starts. When a user logs in, their user ID is synced with RevenueCat.

### 2. **Core Functions** (`src/lib/revenuecatConfig.ts`)

```typescript
// Check if user has premium
const hasPremium = await hasPremiumAccess();

// Get subscription details
const details = await getSubscriptionDetails();

// Get available offerings
const offering = await getOfferings();

// Purchase a package
const result = await purchasePackage(selectedPackage);

// Restore purchases
const result = await restorePurchases();
```

### 3. **React Query Hooks** (`src/lib/hooks/useRevenueCat.ts`)

Use these hooks in your components:

```typescript
import {
  usePremiumStatus,
  useSubscriptionDetails,
  useOfferings,
  usePurchasePackage,
  useRestorePurchases,
} from '@/lib/hooks/useRevenueCat';

function MyComponent() {
  // Check premium status
  const { data: isPremium, isLoading } = usePremiumStatus();

  // Get subscription details
  const { data: details } = useSubscriptionDetails();

  // Purchase mutation
  const purchaseMutation = usePurchasePackage();

  // Restore mutation
  const restoreMutation = useRestorePurchases();
}
```

## 🎨 UI Components

### Paywall Component
Beautiful pre-built paywall modal with RevenueCat's native UI.

```typescript
import { Paywall } from '@/components/Paywall';

function MyScreen() {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <>
      <Button onPress={() => setShowPaywall(true)}>
        Upgrade
      </Button>

      <Paywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseSuccess={() => {
          console.log('Purchase successful!');
        }}
      />
    </>
  );
}
```

### Customer Center
Allows users to manage their subscription, restore purchases, and request refunds.

```typescript
import { CustomerCenter } from '@/components/CustomerCenter';

function SettingsScreen() {
  const [showCenter, setShowCenter] = useState(false);

  return (
    <>
      <Button onPress={() => setShowCenter(true)}>
        Manage Subscription
      </Button>

      <CustomerCenter
        visible={showCenter}
        onClose={() => setShowCenter(false)}
      />
    </>
  );
}
```

### Premium Gate
Restrict content to premium users only.

```typescript
import { PremiumGate } from '@/components/PremiumGate';

function MyScreen() {
  const [showPaywall, setShowPaywall] = useState(false);

  return (
    <PremiumGate
      message="This feature requires TagAlong+ premium"
      onUpgradePress={() => setShowPaywall(true)}
    >
      {/* Premium content here */}
      <AdvancedFeature />
    </PremiumGate>
  );
}
```

### Custom Premium Check

```typescript
import { usePremium } from '@/components/PremiumGate';

function MyComponent() {
  const { isPremium, isLoading } = usePremium();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return isPremium ? (
    <PremiumFeature />
  ) : (
    <UpgradePrompt />
  );
}
```

## 📱 Example Usage

See `src/app/subscription-example.tsx` for a complete working example that shows:
- Premium status display
- Feature list with checkmarks
- Upgrade button
- Manage subscription button
- Integration with Paywall and Customer Center

## 🔑 Key Features

### Error Handling
All functions include comprehensive error handling:
- User cancellation is handled gracefully
- Network errors are caught and logged
- TypeScript types ensure type safety

### Automatic Sync
- User ID syncs automatically on login
- Customer info refreshes via React Query
- Cache invalidation on purchase/restore

### Loading States
React Query provides built-in loading states:
```typescript
const { data, isLoading, error } = usePremiumStatus();
```

### Offline Support
RevenueCat SDK handles offline scenarios automatically.

## 🎯 Implementation Checklist

- [x] Install RevenueCat SDK packages
- [x] Configure API key and entitlements
- [x] Initialize SDK in app startup
- [x] Set user ID on authentication
- [x] Create React Query hooks
- [x] Build Paywall component
- [x] Build Customer Center component
- [x] Create PremiumGate component
- [x] Add example screen

## 📚 Next Steps

1. **Configure Products in RevenueCat Dashboard**
   - Go to https://app.revenuecat.com
   - Create products: `monthly`, `yearly`, `lifetime`
   - Set up pricing in App Store Connect / Google Play Console
   - Configure entitlement `TagAlong+`

2. **Test Purchases**
   - Use sandbox/test users
   - Test purchase flow
   - Test restore functionality
   - Test entitlement checking

3. **Integrate into App**
   - Add premium checks to features
   - Show upgrade prompts
   - Add subscription management to settings

4. **Production**
   - Replace test API key with production key
   - Test in TestFlight/Internal Testing
   - Submit for app review

## 🔗 Resources

- [RevenueCat Documentation](https://www.revenuecat.com/docs)
- [React Native SDK](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
- [Paywall Documentation](https://www.revenuecat.com/docs/tools/paywalls)
- [Customer Center](https://www.revenuecat.com/docs/tools/customer-center)

## ⚠️ Important Notes

1. **Development Builds Required**: RevenueCat requires native modules, so you need to use Expo development builds or rebuild the app after installation.

2. **Product Configuration**: Make sure to configure your products in the RevenueCat dashboard and link them to App Store/Google Play products.

3. **User Authentication**: RevenueCat automatically syncs user IDs when users log in via Supabase.

4. **Testing**: Use sandbox accounts for testing. RevenueCat provides test mode for development.

## 🐛 Troubleshooting

**"Native module not found" error**
- Make sure you're using a development build, not Expo Go
- Rebuild the app after installing packages

**Products not showing**
- Check RevenueCat dashboard configuration
- Ensure products are configured in App Store Connect
- Check API key is correct

**Purchase fails**
- Verify sandbox account is set up
- Check network connection
- Review RevenueCat dashboard logs
