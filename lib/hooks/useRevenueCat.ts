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

export const REVENUECAT_KEYS = {
  customerInfo: ['revenuecat', 'customerInfo'] as const,
  offerings: ['revenuecat', 'offerings'] as const,
  premiumStatus: ['revenuecat', 'premiumStatus'] as const,
  subscriptionDetails: ['revenuecat', 'subscriptionDetails'] as const,
};

export const useCustomerInfo = () => {
  return useQuery({
    queryKey: REVENUECAT_KEYS.customerInfo,
    queryFn: getCustomerInfo,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
};

export const useOfferings = () => {
  return useQuery({
    queryKey: REVENUECAT_KEYS.offerings,
    queryFn: getOfferings,
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });
};

export const useAllOfferings = () => {
  return useQuery({
    queryKey: [...REVENUECAT_KEYS.offerings, 'all'],
    queryFn: getAllOfferings,
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });
};

export const usePremiumStatus = () => {
  return useQuery({
    queryKey: REVENUECAT_KEYS.premiumStatus,
    queryFn: hasPremiumAccess,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
};

export const useSubscriptionDetails = () => {
  return useQuery({
    queryKey: REVENUECAT_KEYS.subscriptionDetails,
    queryFn: getSubscriptionDetails,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
};

export const usePurchasePackage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packageToPurchase: any) => {
      return await purchasePackage(packageToPurchase);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenuecat'] });
    },
    onError: (error: any) => {
      if (!error.userCancelled) {
        console.error('Purchase error:', error);
      }
    },
  });
};

export const useRestorePurchases = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restorePurchases,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenuecat'] });
    },
    onError: (error) => {
      console.error('Restore purchases error:', error);
    },
  });
};
