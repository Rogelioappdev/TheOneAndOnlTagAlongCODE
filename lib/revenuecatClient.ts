export type RevenueCatGuardReason =
  | 'web_not_supported'
  | 'not_configured'
  | 'sdk_error';

export type RevenueCatResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: RevenueCatGuardReason; error?: unknown };

export const isRevenueCatEnabled = (): boolean => false;

export const getOfferings = async (): Promise<RevenueCatResult<any>> => {
  return { ok: false, reason: 'not_configured' };
};

export const purchasePackage = async (_pkg: any): Promise<RevenueCatResult<any>> => {
  return { ok: false, reason: 'not_configured' };
};

export const getCustomerInfo = async (): Promise<RevenueCatResult<any>> => {
  return { ok: false, reason: 'not_configured' };
};

export const restorePurchases = async (): Promise<RevenueCatResult<any>> => {
  return { ok: false, reason: 'not_configured' };
};

export const setUserId = async (_userId: string): Promise<RevenueCatResult<void>> => {
  return { ok: false, reason: 'not_configured' };
};

export const logoutUser = async (): Promise<RevenueCatResult<void>> => {
  return { ok: false, reason: 'not_configured' };
};

export const hasEntitlement = async (_entitlementId: string): Promise<RevenueCatResult<boolean>> => {
  return { ok: false, reason: 'not_configured' };
};

export const hasActiveSubscription = async (): Promise<RevenueCatResult<boolean>> => {
  return { ok: false, reason: 'not_configured' };
};

export const getPackage = async (_packageIdentifier: string): Promise<RevenueCatResult<any>> => {
  return { ok: false, reason: 'not_configured' };
};
