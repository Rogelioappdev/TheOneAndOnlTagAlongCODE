 import { View, Pressable, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radius } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type CardVariant = 'default' | 'elevated' | 'accent' | 'ghost';

interface CardProps {
  children:   React.ReactNode;
  variant?:   CardVariant;
  onPress?:   () => void;
  style?:     ViewStyle;
  padding?:   'none' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const BG: Record<CardVariant, string> = {
  default:  Colors.surface,
  elevated: Colors.surface2,
  accent:   Colors.accentDim,
  ghost:    'transparent',
};

const BORDER: Record<CardVariant, string> = {
  default:  Colors.border,
  elevated: Colors.border,
  accent:   Colors.accentBorder,
  ghost:    Colors.border,
};

const PAD: Record<'none' | 'sm' | 'md' | 'lg', number> = {
  none: 0,
  sm:   Spacing.sm,
  md:   Spacing.md,
  lg:   Spacing.lg,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Card({
  children,
  variant  = 'default',
  onPress,
  style,
  padding  = 'md',
  fullWidth = true,
}: CardProps) {
  const opacity = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const baseStyle: ViewStyle = {
    backgroundColor: BG[variant],
    borderRadius:    Radius.md,
    borderWidth:     variant === 'ghost' ? 0 : 1,
    borderColor:     BORDER[variant],
    padding:         PAD[padding],
    width:           fullWidth ? '100%' : undefined,
    overflow:        'hidden',
  };

  if (onPress) {
    return (
      <Animated.View style={animStyle}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
          }}
          onPressIn={() => {
            opacity.value = withTiming(0.75, { duration: 80 });
          }}
          onPressOut={() => {
            opacity.value = withTiming(1, { duration: 120 });
          }}
          style={[baseStyle, style]}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={[baseStyle, style]}>
      {children}
    </View>
  );
}

// ─── Card.Row ─────────────────────────────────────────────────────────────────
// Horizontal layout helper — use inside Card for icon + text rows, etc.

interface CardRowProps {
  children:  React.ReactNode;
  style?:    ViewStyle;
  gap?:      number;
  align?:    'flex-start' | 'center' | 'flex-end';
  justify?:  'flex-start' | 'center' | 'flex-end' | 'space-between';
}

Card.Row = function CardRow({
  children,
  style,
  gap     = Spacing.sm,
  align   = 'center',
  justify = 'flex-start',
}: CardRowProps) {
  return (
    <View style={[{
      flexDirection:  'row',
      alignItems:     align,
      justifyContent: justify,
      gap,
    }, style]}>
      {children}
    </View>
  );
};

// ─── Card.Divider ─────────────────────────────────────────────────────────────

Card.Divider = function CardDivider({ style }: { style?: ViewStyle }) {
  return (
    <View style={[{
      height:          1,
      backgroundColor: Colors.border,
      marginVertical:  Spacing.sm,
    }, style]} />
  );
};