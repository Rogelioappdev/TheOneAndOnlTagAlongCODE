import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Linking,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Zap, Users, MessageCircle } from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
type PurchasesPackage = any;
import usePremiumStore, { SubscriptionPlan } from '@/lib/state/premium-store';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  ENTITLEMENT_ID,
  getAllOfferings,
} from '@/lib/revenuecatConfig';

interface PremiumPaywallProps {
  onClose: () => void;
  onSubscribe: (plan: SubscriptionPlan) => void;
}

const ONBOARDING_IMAGES = [
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P1.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P2.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P3.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P6.jpg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P8.jpg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/P9.jpg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p11.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p12.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p13.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p14.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p15.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p16.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p17.jpeg',
  'https://tnstvbxngubfuxatggem.supabase.co/storage/v1/object/public/Onboarding%20Images/p18.jpeg',
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.44);
const IMAGE_WIDTH = Math.round(HERO_HEIGHT * 0.72);
const IMAGE_GAP = 10;
const ITEM_WIDTH = IMAGE_WIDTH + IMAGE_GAP;
const TOTAL_WIDTH = ONBOARDING_IMAGES.length * ITEM_WIDTH;

// ─── Helpers (logic unchanged) ────────────────────────────────────────────────

function packageTypeToplan(pkg: PurchasesPackage): SubscriptionPlan {
  const id = pkg.identifier.toLowerCase();
  if (id.includes('annual') || id.includes('yearly') || id === '$rc_annual') return 'yearly';
  if (id.includes('weekly') || id === '$rc_weekly') return 'weekly';
  if (id.includes('month') || id === '$rc_monthly') return 'monthly';
  const pkgType = pkg.packageType?.toLowerCase() ?? '';
  if (pkgType === 'annual') return 'yearly';
  if (pkgType === 'weekly') return 'weekly';
  if (pkgType === 'monthly') return 'monthly';
  return 'weekly';
}

interface PlanOption {
  id: SubscriptionPlan;
  label: string;
  price: string;
  period: string;
  pricePerWeek: string;
  pricePerMonth: string;
  badge?: string;
  savings?: string;
  highlight?: boolean;
  rcPackage?: PurchasesPackage;
}

const MAIN_PLANS_FALLBACK: PlanOption[] = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$9.99',
    period: '/mo',
    pricePerWeek: '$2.31/week',
    pricePerMonth: '$9.99/mo',
    savings: 'Save 54%',
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '$59.99',
    period: '/yr',
    pricePerWeek: '$1.15/week',
    pricePerMonth: '$5.00/mo',
    badge: 'Best Value',
    savings: 'Save 77%',
    highlight: true,
  },
];

const SECONDARY_PLANS_FALLBACK: PlanOption[] = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$9.99',
    period: '/mo',
    pricePerWeek: '$2.31/week',
    pricePerMonth: '$9.99/mo',
    savings: 'Save 54%',
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '$59.99',
    period: '/yr',
    pricePerWeek: '$1.15/week',
    pricePerMonth: '$5.00/mo',
    badge: 'Best Value',
    savings: 'Save 77%',
    highlight: true,
  },
];

function mergeWithOfferings(
  fallbackPlans: PlanOption[],
  packages: PurchasesPackage[]
): PlanOption[] {
  return fallbackPlans.map((plan) => {
    const match = packages.find((pkg) => packageTypeToplan(pkg) === plan.id);
    if (match) {
      const localPrice = match.product?.priceString ?? null;
      return { ...plan, price: localPrice ?? plan.price, rcPackage: match };
    }
    return plan;
  });
}

// ─── Scrolling Image Strip ─────────────────────────────────────────────────────

function ImageStrip({ height = HERO_HEIGHT }: { height?: number }) {
  const scrollX = useSharedValue(0);

  useEffect(() => {
    scrollX.value = withRepeat(
      withTiming(-TOTAL_WIDTH, {
        duration: ONBOARDING_IMAGES.length * 4500,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [scrollX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: scrollX.value }],
  }));

  const allImages = [...ONBOARDING_IMAGES, ...ONBOARDING_IMAGES];

  return (
    <View style={{ height, overflow: 'hidden' }}>
      <Animated.View
        style={[{ flexDirection: 'row', width: TOTAL_WIDTH * 2 }, animatedStyle]}
      >
        {allImages.map((uri, index) => (
          <View
            key={`${uri}-${index}`}
            style={{
              width: IMAGE_WIDTH,
              height,
              marginRight: IMAGE_GAP,
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
            <Image
              source={{ uri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={0}
              cachePolicy="memory-disk"
            />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

// ─── Tinder-style horizontal pill plan selector ────────────────────────────────

function PlanPills({
  plans,
  selectedPlan,
  onSelect,
}: {
  plans: PlanOption[];
  selectedPlan: SubscriptionPlan;
  onSelect: (id: SubscriptionPlan) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
      {plans.map((plan) => {
        const selected = selectedPlan === plan.id;
        return (
          <View key={plan.id} style={{ flex: 1, alignItems: 'center' }}>
            {/* Best Value badge above pill */}
            {plan.badge ? (
              <View style={{
                backgroundColor: '#10b981',
                borderRadius: 20,
                paddingHorizontal: 8,
                paddingVertical: 3,
                marginBottom: 5,
              }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{plan.badge}</Text>
              </View>
            ) : (
              <View style={{ height: 22, marginBottom: 5 }} />
            )}

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(plan.id);
              }}
              style={{
                width: '100%',
                borderRadius: 16,
                borderWidth: 2,
                borderColor: selected ? '#10b981' : '#2a2a2a',
                backgroundColor: selected ? 'rgba(16,185,129,0.12)' : '#111',
                paddingVertical: 14,
                paddingHorizontal: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: selected ? '#10b981' : '#6b7280',
                fontSize: 13,
                fontWeight: '600',
                marginBottom: 4,
              }}>
                {plan.label}
              </Text>
              <Text style={{
                color: selected ? '#ffffff' : '#9ca3af',
                fontSize: 18,
                fontWeight: '800',
                letterSpacing: -0.5,
              }}>
                {plan.price}
              </Text>
              <Text style={{
                color: selected ? 'rgba(255,255,255,0.5)' : '#4b5563',
                fontSize: 11,
                marginTop: 2,
              }}>
                {plan.period}
              </Text>
              {plan.savings && (
                <Text style={{
                  color: '#10b981',
                  fontSize: 10,
                  fontWeight: '600',
                  marginTop: 4,
                }}>
                  {plan.savings}
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

// ─── Feature row ───────────────────────────────────────────────────────────────

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
      <View style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(16,185,129,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        {icon}
      </View>
      <Text style={{ color: '#d1d5db', fontSize: 14, fontWeight: '500' }}>{text}</Text>
    </View>
  );
}

// ─── Root component (logic unchanged) ─────────────────────────────────────────

export default function PremiumPaywall({ onClose, onSubscribe }: PremiumPaywallProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [showSecondary, setShowSecondary] = useState(false);
  const [mainPlans, setMainPlans] = useState<PlanOption[]>(MAIN_PLANS_FALLBACK);
  const [secondaryPlans, setSecondaryPlans] = useState<PlanOption[]>(SECONDARY_PLANS_FALLBACK);
  const setPremium = usePremiumStore(s => s.setPremium);

  useEffect(() => {
    getAllOfferings().then((allOfferings) => {
      if (allOfferings.length === 0) {
        return getOfferings().then((offering) => {
          if (offering?.availablePackages.length) {
            setMainPlans(mergeWithOfferings(MAIN_PLANS_FALLBACK, offering.availablePackages));
            setSecondaryPlans(mergeWithOfferings(SECONDARY_PLANS_FALLBACK, offering.availablePackages));
          }
        });
      }
      const allPackages = allOfferings.flatMap((o) => o.availablePackages);
      if (allPackages.length === 0) return;
      setMainPlans(mergeWithOfferings(MAIN_PLANS_FALLBACK, allPackages));
      setSecondaryPlans(mergeWithOfferings(SECONDARY_PLANS_FALLBACK, allPackages));
    }).catch(() => {});
  }, []);

  const handleSubscribe = useCallback(async (
    planId: SubscriptionPlan,
    plans: PlanOption[],
    setLoading: (v: boolean) => void
  ) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan?.rcPackage) {
      Alert.alert('Unavailable', 'Subscription purchasing is not available at this time. Please try again later.');
      return;
    }
    try {
      setLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const result = await purchasePackage(plan.rcPackage);
      if (result.success) {
        setPremium(planId);
        onSubscribe(planId);
      }
    } catch (error: any) {
      if (!error?.userCancelled) {
        Alert.alert('Purchase Failed', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [setPremium, onSubscribe]);

  const handleRestore = useCallback(async (setLoading: (v: boolean) => void) => {
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await restorePurchases();
      if (result.success) {
        const productId = result.customerInfo.entitlements.active[ENTITLEMENT_ID]?.productIdentifier ?? '';
        const restoredPlan: SubscriptionPlan =
          productId.includes('annual') || productId.includes('yearly') ? 'yearly'
          : productId.includes('month') ? 'monthly'
          : 'weekly';
        setPremium(restoredPlan);
        onSubscribe(restoredPlan);
        Alert.alert('Restored!', 'Your subscription has been restored.');
      } else {
        Alert.alert('Nothing to Restore', 'No previous purchases were found.');
      }
    } catch {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [setPremium, onSubscribe]);

  const handleXPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSecondary(true);
  }, []);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  if (showSecondary) {
    return (
      <SecondaryPaywall
        selectedPlan={selectedPlan}
        onSelectPlan={setSelectedPlan}
        plans={secondaryPlans}
        onSubscribe={(planId, setLoading) => handleSubscribe(planId, secondaryPlans, setLoading)}
        onRestore={handleRestore}
        onClose={handleClose}
      />
    );
  }

  return (
    <MainPaywall
      selectedPlan={selectedPlan}
      onSelectPlan={setSelectedPlan}
      plans={mainPlans}
      onSubscribe={(planId, setLoading) => handleSubscribe(planId, mainPlans, setLoading)}
      onRestore={handleRestore}
      onXPress={handleXPress}
    />
  );
}

// ─── Main Paywall ──────────────────────────────────────────────────────────────

function MainPaywall({
  selectedPlan,
  onSelectPlan,
  plans,
  onSubscribe,
  onRestore,
  onXPress,
}: {
  selectedPlan: SubscriptionPlan;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  plans: PlanOption[];
  onSubscribe: (planId: SubscriptionPlan, setLoading: (v: boolean) => void) => void;
  onRestore: (setLoading: (v: boolean) => void) => void;
  onXPress: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const selected = plans.find(p => p.id === selectedPlan);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* ── Hero: full-width scrolling photos with gradient fade ── */}
      <View style={{ height: HERO_HEIGHT }}>
        <ImageStrip />
        {/* Gradient fade to black at bottom of hero */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.6)', '#000000']}
          locations={[0.4, 0.75, 1]}
          style={{
            position: 'absolute',
            left: 0, right: 0, bottom: 0,
            height: HERO_HEIGHT * 0.6,
          }}
        />
        {/* Headline on top of gradient */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
          }}
        >
          <Text style={{
            color: '#fff',
            fontSize: 36,
            fontWeight: '800',
            letterSpacing: -1,
            lineHeight: 42,
          }}>
            Unlimited{'\n'}Swipes
          </Text>
          <Text style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 15,
            marginTop: 6,
            fontWeight: '400',
          }}>
            Unlock the full TagAlong experience
          </Text>
        </Animated.View>

        {/* X button */}
        <Animated.View
          entering={FadeIn.delay(400).duration(400)}
          style={{ position: 'absolute', top: 52, right: 20 }}
        >
          <Pressable
            onPress={onXPress}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} color="#fff" strokeWidth={2.5} />
          </Pressable>
        </Animated.View>
      </View>

      {/* ── Bottom sheet ── */}
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

        {/* Feature bullets */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginTop: 14, marginBottom: 16 }}>
          <FeatureRow icon={<Zap size={16} color="#10b981" strokeWidth={2.5} />} text="Unlimited trip & traveler swipes" />
          <FeatureRow icon={<Users size={16} color="#10b981" strokeWidth={2.5} />} text="Match with compatible travelers" />
          <FeatureRow icon={<MessageCircle size={16} color="#10b981" strokeWidth={2.5} />} text="Join trip group chats" />
        </Animated.View>

        {/* Plan pills */}
        <Animated.View entering={FadeInDown.delay(280).duration(400)}>
          <PlanPills
            plans={plans}
            selectedPlan={selectedPlan}
            onSelect={onSelectPlan}
          />
        </Animated.View>

        {/* CTA button */}
        <Animated.View entering={FadeInUp.delay(350).duration(400)}>
          <Pressable
            onPress={() => onSubscribe(selectedPlan, setLoading)}
            disabled={loading}
            style={({ pressed }) => ({ opacity: pressed || loading ? 0.8 : 1 })}
          >
            <LinearGradient
              colors={['#34d399', '#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 18 }}
            >
              <View style={{ paddingVertical: 17, alignItems: 'center' }}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 }}>
                      Start TagAlong+
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                      {selected?.pricePerWeek} · Cancel anytime
                    </Text>
                  </>
                )}
              </View>
            </LinearGradient>
          </Pressable>

          {/* Restore */}
          <Pressable
            onPress={() => onRestore(setLoading)}
            disabled={loading}
            style={{ alignItems: 'center', paddingVertical: 14 }}
          >
            <Text style={{ color: '#3f3f46', fontSize: 12 }}>Restore purchases</Text>
          </Pressable>
        </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Secondary Paywall ─────────────────────────────────────────────────────────

function SecondaryPaywall({
  selectedPlan,
  onSelectPlan,
  plans,
  onSubscribe,
  onRestore,
  onClose,
}: {
  selectedPlan: SubscriptionPlan;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  plans: PlanOption[];
  onSubscribe: (planId: SubscriptionPlan, setLoading: (v: boolean) => void) => void;
  onRestore: (setLoading: (v: boolean) => void) => void;
  onClose: () => void;
}) {
  const [localPlan, setLocalPlan] = useState<SubscriptionPlan>('yearly');
  const [loading, setLoading] = useState(false);
  const selected = plans.find(p => p.id === localPlan);

  const handleSelect = (plan: SubscriptionPlan) => {
    setLocalPlan(plan);
    onSelectPlan(plan);
  };

  // Secondary hero is 40% of screen — enough for a nice image but leaves
  // solid room for features + pills + CTA below with no bleed-through
  const SECONDARY_HERO = Math.round(SCREEN_HEIGHT * 0.40);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>

      {/* ── Hero: clipped image strip + gradient + headline ── */}
      <View style={{ height: SECONDARY_HERO, overflow: 'hidden' }}>
        <ImageStrip height={SECONDARY_HERO} />
        {/* Strong gradient so headline is always readable */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)', '#000000']}
          locations={[0.3, 0.65, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: SECONDARY_HERO }}
        />
        <Animated.View
          entering={FadeInDown.delay(80).duration(500)}
          style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}
        >
          <Text style={{
            color: '#fff',
            fontSize: 28,
            fontWeight: '800',
            letterSpacing: -0.8,
            lineHeight: 34,
          }}>
            Not sure yet?{'\n'}Pick what works for you.
          </Text>
        </Animated.View>
      </View>

      {/* ── Bottom section: fully solid black, no image bleed ── */}
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1, backgroundColor: '#000', paddingHorizontal: 20, paddingBottom: 4 }}
      >
        {/* Feature bullets */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={{ marginTop: 16, marginBottom: 4 }}>
          <FeatureRow icon={<Zap size={15} color="#10b981" strokeWidth={2.5} />} text="Unlimited trip & traveler swipes" />
          <FeatureRow icon={<Users size={15} color="#10b981" strokeWidth={2.5} />} text="Match with compatible travelers" />
          <FeatureRow icon={<MessageCircle size={15} color="#10b981" strokeWidth={2.5} />} text="Join trip group chats" />
        </Animated.View>

        {/* Maybe later — visible but clearly secondary */}
        <Pressable
          onPress={onClose}
          style={{ alignItems: 'center', paddingVertical: 8 }}
        >
          <Text style={{ color: '#6b7280', fontSize: 14, fontWeight: '400', textDecorationLine: 'underline' }}>
            Maybe later
          </Text>
        </Pressable>

        {/* Plan pills */}
        <Animated.View entering={FadeInDown.delay(220).duration(400)} style={{ marginTop: 2 }}>
          <PlanPills
            plans={plans}
            selectedPlan={localPlan}
            onSelect={handleSelect}
          />
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)}>
          <Pressable
            onPress={() => onSubscribe(localPlan, setLoading)}
            disabled={loading}
            style={({ pressed }) => ({ opacity: pressed || loading ? 0.8 : 1 })}
          >
            <LinearGradient
              colors={['#34d399', '#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ borderRadius: 18 }}
            >
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 }}>
                      Start TagAlong+
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>
                      {selected?.pricePerMonth} · Cancel anytime
                    </Text>
                  </>
                )}
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => onRestore(setLoading)}
            disabled={loading}
            style={{ alignItems: 'center', paddingVertical: 10 }}
          >
            <Text style={{ color: '#3f3f46', fontSize: 12 }}>Restore purchases</Text>
          </Pressable>

          {/* Apple-required legal links */}
          <View style={{ alignItems: 'center', paddingTop: 4, paddingBottom: 8, gap: 6 }}>
            <Text style={{ color: '#6b7280', fontSize: 11, textAlign: 'center', lineHeight: 16 }}>
              Subscription auto-renews until cancelled. Manage in Settings.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable onPress={() => Linking.openURL('https://sites.google.com/view/privacypolicytag/p%C3%A1gina-principal')}>
                <Text style={{ color: '#6b7280', fontSize: 11, textDecorationLine: 'underline' }}>
                  Privacy Policy
                </Text>
              </Pressable>
              <Text style={{ color: '#6b7280', fontSize: 11 }}>·</Text>
              <Pressable onPress={() => Linking.openURL('https://sites.google.com/view/tagalong-eula/p%C3%A1gina-principal')}>
                <Text style={{ color: '#6b7280', fontSize: 11, textDecorationLine: 'underline' }}>
                  Terms of Use
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}