import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  PanResponder,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
} from 'react-native';
import { Tabs } from 'expo-router';
import {
  User,
  MessageCircle,
  ChevronUp,
} from 'lucide-react-native';
import { useTotalUnreadCount } from '@/lib/hooks/useChat';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/lib/theme';

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTIVE   = '#FFFFFF';
const INACTIVE = 'rgba(255,255,255,0.38)';

const TAB_BAR_HEIGHT = 66;
const TAB_BAR_BOTTOM = 26;
const HANDLE_HEIGHT  = 44;
const HIDDEN_Y       = 78;

// ─── Tab button ──────────────────────────────────────────────────────────────
function TabButton({
  children,
  onPress,
  focused,
  label,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  focused: boolean;
  label: string;
}) {
  const scale = useRef(new Animated.Value(focused ? 1.04 : 1)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: focused ? 1.04 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      style={styles.tabBtn}
    >
      <Animated.View style={[styles.tabInner, { transform: [{ scale }] }]}>
        <View style={styles.iconWrap}>{children}</View>
        <Text style={[styles.tabLabel, { color: focused ? ACTIVE : INACTIVE }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── Badge (green for trips, blue for messages) ──────────────────────────────
function Badge({ count, color }: { count: number; color: string }) {
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
}

// ─── Collapsible tab bar wrapper ─────────────────────────────────────────────
function CollapsibleTabBar({
  state,
  navigation,
}: {
  state: any;
  navigation: any;
}) {
  const isHome = state.routes[state.index]?.name === 'index';

  const totalUnread = useTotalUnreadCount();

  // Animation: 0 = fully visible, HIDDEN_Y = mostly off-screen (peek visible)
  const translateY = useRef(new Animated.Value(isHome ? HIDDEN_Y : 0)).current;
  const [revealed, setRevealed] = useState(false);

  // Keep a ref so PanResponder always reads the latest value
  const revealedRef = useRef(false);

  const animateIn = useCallback(() => {
    revealedRef.current = true;
    setRevealed(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, []);

  const animateOut = useCallback(() => {
    revealedRef.current = false;
    setRevealed(false);
    Animated.spring(translateY, {
      toValue: HIDDEN_Y,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, []);

  // ── Animate in / out based on active route ──
  useEffect(() => {
    if (isHome) {
      animateOut();
    } else {
      animateIn();
    }
  }, [isHome]);

  // ── Drag gesture on the handle ──
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -20) {
          // Dragged up → reveal
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          revealedRef.current ? null : (() => {
            revealedRef.current = true;
            setRevealed(true);
            Animated.spring(translateY, {
              toValue: 0, useNativeDriver: true, tension: 80, friction: 12,
            }).start();
          })();
        } else if (gesture.dy > 20) {
          // Dragged down → hide
          revealedRef.current = false;
          setRevealed(false);
          Animated.spring(translateY, {
            toValue: HIDDEN_Y, useNativeDriver: true, tension: 60, friction: 12,
          }).start();
        } else if (Math.abs(gesture.dy) < 8 && Math.abs(gesture.dx) < 8) {
          // Tap (minimal movement) → toggle
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const shouldReveal = !revealedRef.current;
          revealedRef.current = shouldReveal;
          setRevealed(shouldReveal);
          Animated.spring(translateY, {
            toValue: shouldReveal ? 0 : HIDDEN_Y,
            useNativeDriver: true,
            tension: shouldReveal ? 80 : 60,
            friction: 12,
          }).start();
        }
      },
    }),
  ).current;

  // ── Navigate + auto-hide ──
  const handleTabPress = useCallback(
    (routeName: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate(routeName);
      if (routeName === 'index') {
        setTimeout(() => {
          revealedRef.current = false;
          setRevealed(false);
          Animated.spring(translateY, {
            toValue: HIDDEN_Y, useNativeDriver: true, tension: 60, friction: 12,
          }).start();
        }, 250);
      }
    },
    [navigation],
  );

  // ── Interpolated values ──
  const chevronOpacity = translateY.interpolate({
    inputRange: [0, HIDDEN_Y * 0.4, HIDDEN_Y],
    outputRange: [0, 0.3, 1],
  });

  const chevronTranslateY = translateY.interpolate({
    inputRange: [0, HIDDEN_Y],
    outputRange: [10, 0],
  });

  const overlayOpacity = translateY.interpolate({
    inputRange: [0, HIDDEN_Y],
    outputRange: [1, 0],
  });

  // Helper to check if a route is focused
  const isFocused = (name: string) =>
    state.routes[state.index]?.name === name;

  // ── Render ──
  return (
    <>
      {/* Transparent overlay — catches taps to dismiss (only when on home + revealed) */}
      {isHome && (
        <Animated.View
          pointerEvents={revealed ? 'auto' : 'none'}
          style={[
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        >
          <TouchableWithoutFeedback onPress={() => {
            revealedRef.current = false;
            setRevealed(false);
            Animated.spring(translateY, {
              toValue: HIDDEN_Y, useNativeDriver: true, tension: 60, friction: 12,
            }).start();
          }}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      {/* Chevron handle — visible when tab bar is hidden (home only) */}
      {isHome && (
        <Animated.View
          style={[
            styles.chevronWrap,
            {
              opacity: chevronOpacity,
              transform: [{ translateY: chevronTranslateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.chevronPill}>
            <ChevronUp size={18} color="rgba(255,255,255,0.6)" strokeWidth={2.5} />
          </View>
        </Animated.View>
      )}

      {/* Tab bar — animated container */}
      <Animated.View
        style={[
          styles.tabBarOuter,
          { transform: [{ translateY }] },
        ]}
      >
        {/* Drag handle on top of tab bar (visible when revealed on home) */}
        {isHome && (
          <View {...panResponder.panHandlers} style={styles.dragHandle}>
            <View style={styles.dragHandleLine} />
          </View>
        )}

        {/* Tab bar pill */}
        <View style={styles.tabBarPill}>
          {/* Messages */}
          <TabButton
            focused={isFocused('messages')}
            label="Messages"
            onPress={() => handleTabPress('messages')}
          >
            <View>
              <MessageCircle
                size={22}
                color={isFocused('messages') ? ACTIVE : INACTIVE}
                strokeWidth={1.8}
              />
              <Badge count={totalUnread} color="#0a84ff" />
            </View>
          </TabButton>

          {/* Center — TagAlong */}
          <TabButton
            focused={isFocused('index')}
            label="TagAlong"
            onPress={() => handleTabPress('index')}
          >
            <Image
              source={require('../../../public/tagalong-icon.png')}
              style={{
                width: 43,
                height: 43,
                tintColor: isFocused('index') ? ACTIVE : INACTIVE,
              }}
              resizeMode="contain"
            />
          </TabButton>

          {/* Profile */}
          <TabButton
            focused={isFocused('profile')}
            label="Profile"
            onPress={() => handleTabPress('profile')}
          >
            <User
              size={22}
              color={isFocused('profile') ? ACTIVE : INACTIVE}
              strokeWidth={1.8}
            />
          </TabButton>
        </View>
      </Animated.View>
    </>
  );
}

// ─── Main layout ─────────────────────────────────────────────────────────────
export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <CollapsibleTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="my-trips" options={{ title: '', href: null }} />
      <Tabs.Screen name="matches"  options={{ title: '', href: null }} />
      <Tabs.Screen name="index"    options={{ title: '' }} />
      <Tabs.Screen name="messages" options={{ title: '' }} />
      <Tabs.Screen name="profile"  options={{ title: '' }} />
      <Tabs.Screen name="bucket-list" options={{ href: null }} />
    </Tabs>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: 'Outfit-SemiBold',
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -7,
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 90,
  },

  chevronWrap: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    zIndex: 100,
    paddingHorizontal: 40,
    paddingVertical: 12,
  },
  chevronPill: {
    width: 44,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabBarOuter: {
    position: 'absolute',
    bottom: TAB_BAR_BOTTOM,
    left: 10,
    right: 10,
    zIndex: 100,
    alignItems: 'center',
  },

  dragHandle: {
    width: 80,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -2,
  },
  dragHandleLine: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  tabBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050505',
    borderRadius: 36,
    height: TAB_BAR_HEIGHT,
    width: '100%',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 20,
    elevation: 20,
  },
});
