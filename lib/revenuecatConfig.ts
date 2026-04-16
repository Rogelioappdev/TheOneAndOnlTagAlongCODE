export const ENTITLEMENT_ID = 'TagAlong+';

export const PRODUCT_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  LIFETIME: 'lifetime',
} as const;

export const initializeRevenueCat = async (): Promise<void> => {
  console.log('[RevenueCat] Stub - not available in this environment');
};

export const setRevenueCatUserId = async (_userId: string): Promise<void> => {
  console.log('[RevenueCat] Stub - setRevenueCatUserId');
};

export const getOfferings = async (): Promise<null> => {
  return null;
};

export const getAllOfferings = async (): Promise<any[]> => {
  return [];
};

export const purchasePackage = async (_pkg: any): Promise<{ customerInfo: any; success: boolean }> => {
  return { customerInfo: null, success: false };
};

export const restorePurchases = async (): Promise<{ customerInfo: any; success: boolean }> => {
  return { customerInfo: null, success: false };
};

export const getCustomerInfo = async (): Promise<any> => {
  return null;
};

export const hasPremiumAccess = async (): Promise<boolean> => {
  return false;
};

export const getSubscriptionDetails = async (): Promise<{
  isPremium: boolean;
  expirationDate?: string;
  productIdentifier?: string;
  willRenew?: boolean;
  periodType?: string;
} | null> => {
  return { isPremium: false };
};

export const logoutRevenueCat = async (): Promise<void> => {
  console.log('[RevenueCat] Stub - logout');
};
