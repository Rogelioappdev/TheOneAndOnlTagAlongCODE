import Purchases, {
  LOG_LEVEL,
  PurchasesOffering,
  CustomerInfo,
  PurchasesPackage,
} from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API Keys
const REVENUECAT_API_KEY = 'appl_qqVmojJoTtqAutiuQqZTkuqYDwh';

// Entitlement identifier
export const ENTITLEMENT_ID = 'TagAlong+';

// Product IDs
export const PRODUCT_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  LIFETIME: 'lifetime',
} as const;

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts
 */
export const initializeRevenueCat = async (): Promise<void> => {
  try {
    // Set up custom log handler BEFORE configure to suppress expected "no offerings" errors
    // These are not actual errors - just warnings that no products are configured in RevenueCat dashboard
    Purchases.setLogHandler((logLevel, message) => {
      // Suppress the "no products registered" error - it's expected when offerings aren't configured
      if (message.includes('no products registered') || message.includes('why-are-offerings-empty')) {
        console.log('[RevenueCat] ℹ️ No offerings configured yet - this is normal during development');
        return;
      }

      // Log other messages based on level
      if (logLevel === LOG_LEVEL.ERROR) {
        console.log('[RevenueCat]', message);
      } else if (__DEV__ && logLevel === LOG_LEVEL.DEBUG) {
        console.log('[RevenueCat]', message);
      }
    });

    // Configure SDK with API key
    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
    });

    console.log('✅ RevenueCat initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing RevenueCat:', error);
    throw error;
  }
};

/**
 * Set user ID for RevenueCat
 * Call this after user authentication
 */
export const setRevenueCatUserId = async (userId: string): Promise<void> => {
  try {
    await Purchases.logIn(userId);
    console.log(`✅ RevenueCat user ID set: ${userId}`);
  } catch (error) {
    console.error('❌ Error setting RevenueCat user ID:', error);
    throw error;
  }
};

/**
 * Get current offerings (subscription packages)
 * Falls back to searching all offerings if no current offering is set.
 */
export const getOfferings = async (): Promise<PurchasesOffering | null> => {
  try {
    const offerings = await Purchases.getOfferings();

    if (offerings.current !== null) {
      console.log('✅ Current offerings retrieved:', offerings.current.identifier);
      return offerings.current;
    }

    // Fall back to the first available TagAlong offering
    const allOfferings = Object.values(offerings.all);
    if (allOfferings.length > 0) {
      console.log('✅ Using first available offering:', allOfferings[0].identifier);
      return allOfferings[0];
    }

    console.warn('⚠️ No current offering found');
    return null;
  } catch (error: any) {
    // RevenueCat throws when no products are configured in App Store Connect yet.
    // This is expected during development — treat it as "no offerings" instead of a crash.
    const msg: string = error?.message ?? '';
    if (
      msg.includes('why-are-offerings-empty') ||
      msg.includes('no products registered') ||
      msg.includes('None of the products registered')
    ) {
      console.log('[RevenueCat] ℹ️ No offerings configured yet - this is normal during development');
      return null;
    }
    console.error('❌ Error getting offerings:', error);
    return null;
  }
};

/**
 * Get all available offerings (subscription packages)
 */
export const getAllOfferings = async (): Promise<PurchasesOffering[]> => {
  try {
    const offerings = await Purchases.getOfferings();
    return Object.values(offerings.all);
  } catch (error: any) {
    const msg: string = error?.message ?? '';
    if (
      msg.includes('why-are-offerings-empty') ||
      msg.includes('no products registered') ||
      msg.includes('None of the products registered')
    ) {
      console.log('[RevenueCat] ℹ️ No offerings configured yet - this is normal during development');
      return [];
    }
    console.error('❌ Error getting all offerings:', error);
    return [];
  }
};

/**
 * Purchase a package
 */
export const purchasePackage = async (
  packageToPurchase: PurchasesPackage
): Promise<{ customerInfo: CustomerInfo; success: boolean }> => {
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

    // Check if user now has the entitlement
    const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    if (hasEntitlement) {
      console.log('✅ Purchase successful! User now has premium access');
    }

    return { customerInfo, success: hasEntitlement };
  } catch (error: any) {
    // Handle user cancellation gracefully
    if (error.userCancelled) {
      console.log('ℹ️ User cancelled the purchase');
      return { customerInfo: await getCustomerInfo(), success: false };
    }

    console.error('❌ Error purchasing package:', error);
    throw error;
  }
};

/**
 * Restore purchases
 */
export const restorePurchases = async (): Promise<{
  customerInfo: CustomerInfo;
  success: boolean;
}> => {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasEntitlement = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;

    if (hasEntitlement) {
      console.log('✅ Purchases restored! User has premium access');
    } else {
      console.log('ℹ️ No purchases to restore');
    }

    return { customerInfo, success: hasEntitlement };
  } catch (error) {
    console.error('❌ Error restoring purchases:', error);
    throw error;
  }
};

/**
 * Get customer info (current subscription status)
 */
export const getCustomerInfo = async (): Promise<CustomerInfo> => {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('❌ Error getting customer info:', error);
    throw error;
  }
};

/**
 * Check if user has premium access
 */
export const hasPremiumAccess = async (): Promise<boolean> => {
  try {
    const customerInfo = await getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

    const hasAccess = entitlement !== undefined;
    console.log(`${hasAccess ? '✅' : 'ℹ️'} Premium access: ${hasAccess}`);

    return hasAccess;
  } catch (error) {
    console.error('❌ Error checking premium access:', error);
    return false;
  }
};

/**
 * Get subscription details
 */
export const getSubscriptionDetails = async (): Promise<{
  isPremium: boolean;
  expirationDate?: string;
  productIdentifier?: string;
  willRenew?: boolean;
  periodType?: string;
} | null> => {
  try {
    const customerInfo = await getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

    if (!entitlement) {
      return {
        isPremium: false,
      };
    }

    return {
      isPremium: true,
      expirationDate: entitlement.expirationDate || undefined,
      productIdentifier: entitlement.productIdentifier,
      willRenew: entitlement.willRenew,
      periodType: entitlement.periodType,
    };
  } catch (error) {
    console.error('❌ Error getting subscription details:', error);
    return null;
  }
};

/**
 * Log out user from RevenueCat
 */
export const logoutRevenueCat = async (): Promise<void> => {
  try {
    await Purchases.logOut();
    console.log('✅ Logged out from RevenueCat');
  } catch (error) {
    console.error('❌ Error logging out from RevenueCat:', error);
    throw error;
  }
};
