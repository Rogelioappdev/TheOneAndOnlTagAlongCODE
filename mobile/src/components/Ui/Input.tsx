 import { useState, forwardRef } from 'react';
import { View, Text, TextInput, Pressable, TextInputProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors, Font, FontSize, Spacing, Radius } from '@/lib/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?:       string;
  error?:       string;
  hint?:        string;
  icon?:        React.ReactNode;  // left icon
  iconRight?:   React.ReactNode;  // right icon / action
  onIconRightPress?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, hint, icon, iconRight, onIconRightPress, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);

  const borderAnim = useSharedValue(0);
  const animStyle  = useAnimatedStyle(() => ({
    borderColor: borderAnim.value === 1
      ? Colors.accent
      : error
        ? Colors.danger
        : Colors.border,
  }));

  const handleFocus = (e: any) => {
    setFocused(true);
    borderAnim.value = withTiming(1, { duration: 150 });
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFocused(false);
    borderAnim.value = withTiming(0, { duration: 150 });
    props.onBlur?.(e);
  };

  return (
    <View style={{ width: '100%' }}>

      {/* Label */}
      {label && (
        <Text style={{
          fontFamily:   Font.semiBold,
          fontSize:     FontSize.sm,
          color:        focused ? Colors.accent : Colors.textSecondary,
          marginBottom: Spacing.xs,
        }}>
          {label}
        </Text>
      )}

      {/* Input row */}
      <Animated.View style={[{
        flexDirection:   'row',
        alignItems:      'center',
        backgroundColor: Colors.surface2,
        borderRadius:    Radius.md,
        borderWidth:     1,
        minHeight:       48,
        paddingHorizontal: icon ? Spacing.sm : Spacing.md,
        gap: Spacing.sm,
      }, animStyle]}>

        {/* Left icon */}
        {icon && (
          <View style={{ opacity: focused ? 1 : 0.4 }}>
            {icon}
          </View>
        )}

        {/* Text input */}
        <TextInput
          ref={ref}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={Colors.textDisabled}
          style={{
            flex:        1,
            fontFamily:  Font.regular,
            fontSize:    FontSize.base,
            color:       Colors.text,
            paddingVertical: Spacing.sm,
          }}
        />

        {/* Right icon / action */}
        {iconRight && (
          onIconRightPress ? (
            <Pressable
              onPress={onIconRightPress}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 0.6 })}
            >
              {iconRight}
            </Pressable>
          ) : (
            <View style={{ opacity: 0.5 }}>{iconRight}</View>
          )
        )}
      </Animated.View>

      {/* Error */}
      {error && (
        <Text style={{
          fontFamily:  Font.regular,
          fontSize:    FontSize.xs,
          color:       Colors.danger,
          marginTop:   Spacing.xs,
        }}>
          {error}
        </Text>
      )}

      {/* Hint */}
      {!error && hint && (
        <Text style={{
          fontFamily:  Font.regular,
          fontSize:    FontSize.xs,
          color:       Colors.textTertiary,
          marginTop:   Spacing.xs,
        }}>
          {hint}
        </Text>
      )}

    </View>
  );
});