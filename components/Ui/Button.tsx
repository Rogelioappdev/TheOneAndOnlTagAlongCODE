import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Font, FontSize, Spacing, Radius, LetterSpacing } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;   // rendered left of label
  iconRight?: React.ReactNode; // rendered right of label
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const BG: Record<ButtonVariant, string> = {
  primary:   Colors.accent,
  secondary: Colors.surface2,
  ghost:     'transparent',
  danger:    Colors.danger,
};

const BG_PRESSED: Record<ButtonVariant, string> = {
  primary:   '#18A665',   // accent darkened ~10%
  secondary: Colors.surface3,
  ghost:     Colors.accentMuted,
  danger:    '#CC3530',
};

const LABEL_COLOR: Record<ButtonVariant, string> = {
  primary:   '#000000',
  secondary: Colors.text,
  ghost:     Colors.accent,
  danger:    '#FFFFFF',
};

const BORDER_COLOR: Record<ButtonVariant, string | undefined> = {
  primary:   undefined,
  secondary: Colors.border,
  ghost:     Colors.accentBorder,
  danger:    undefined,
};

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 48, lg: 56 };
const FONT_SIZE: Record<ButtonSize, number> = { sm: FontSize.sm, md: FontSize.base, lg: FontSize.md };
const H_PAD: Record<ButtonSize, number>   = { sm: Spacing.md, md: Spacing.lg, lg: Spacing.lg };

// ─── Component ────────────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconRight,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    scale.value = withSpring(0.96, { stiffness: 400, damping: 15 }, () => {
      scale.value = withSpring(1, { stiffness: 300, damping: 12 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={[animStyle, fullWidth && { width: '100%' }]}>
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        style={({ pressed }) => ({
          height: HEIGHT[size],
          paddingHorizontal: H_PAD[size],
          borderRadius: Radius.full,
          backgroundColor: pressed && !isDisabled ? BG_PRESSED[variant] : BG[variant],
          borderWidth: BORDER_COLOR[variant] ? 1 : 0,
          borderColor: BORDER_COLOR[variant],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: Spacing.xs,
          opacity: isDisabled ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        })}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={LABEL_COLOR[variant]}
          />
        ) : (
          <>
            {icon && <View>{icon}</View>}
            <Text
              style={{
                fontFamily:    Font.bold,
                fontSize:      FONT_SIZE[size],
                color:         LABEL_COLOR[variant],
                letterSpacing: LetterSpacing.none,
              }}
            >
              {label}
            </Text>
            {iconRight && <View>{iconRight}</View>}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
} 