import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCustomerInfo,
  getOfferings,
  getAllOfferings,
  hasPremiumAccess,
  purchasePackage,
  restorePurchases,
  getSubscriptionDetails,
} from '@/lib/revenuecatConfig';
import { PurchasesPackage } from 'react-native-purchases';

// Query keys
export const REVENUECAT_KEYS = {
  customerInfo: ['revenuecat', 'customerInfo'] as const,
  offerings: ['revenuecat', 'offerings'] as const,
  premiumStatus: ['revenuecat', 'premiumStatus'] as const,
  subscriptionDetails: ['revenuecat', 'subscriptionDetails'] as const,
};

/**
 * Hook to get customer info
 */
export const useCustomerInfo = () => {
  return useQuery({
    queryKey: REVENUECAT_KEYS.customerInfo,
    queryFn: getCustomerInfo,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
};

/**
 * Hook to get available offerings/packages
 */
export const useOfferings = () => {
  return useQuery({
    queryKey: REVENUECAT_KEYS.offerings,
    queryFn: getOfferings,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  });
};

/**
 * Hook to get all available offerings
 */
export const useAllOfferings = () => {
  return useQuery({
    queryKey: [...REVENUECAT_KEYS.offerings, 'all'],
    queryFn: getAllOfferings,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  });
};

/**
 * Hook to check premium status
 */
export const usePremiumStatus = () => {
  return useQuery({
    queryKey: REVENUECAT_KEYS.premiumStatus,
    queryFn: hasPremiumAccess,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
};

/**
 * Hook to get subscription details
 */
export const useSubscriptionDetails = () => {
  return useQuery({
    queryKey: REVENUECAT_KEYS.subscriptionDetails,
    queryFn: getSubscriptionDetails,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
};

/**
 * Hook to purchase a package
 */
export const usePurchasePackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageToPurchase: PurchasesPackage) => {
      return await purchasePackage(packageToPurchase);
    },
    onSuccess: () => {
      // Invalidate all RevenueCat queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['revenuecat'] });
    },
    onError: (error: any) => {
      if (!error.userCancelled) {
        console.error('Purchase error:', error);
      }
    },
  });
};

/**
 * Hook to restore purchases
 */
export const useRestorePurchases = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restorePurchases,
    onSuccess: () => {
      // Invalidate all RevenueCat queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['revenuecat'] });
    },
    onError: (error) => {
      console.error('Restore purchases error:', error);
    },
  });
};
