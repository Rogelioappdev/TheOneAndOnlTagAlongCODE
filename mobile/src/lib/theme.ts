 // ─────────────────────────────────────────────────────────────────────────────
// TagAlong — Design Tokens  v1.0
//
// Single source of truth for every color, type size, weight, and spacing
// value in the app. Import from here — never hardcode values inline.
//
// Accent:  #F0EBE3  (Warm Stone)
// Font:    Outfit   (@expo-google-fonts/outfit)
// Mode:    Dark only
// ─────────────────────────────────────────────────────────────────────────────

// ─── Colors ──────────────────────────────────────────────────────────────────

export const Colors = {

  // ── Brand accent ────────────────────────────────────────────────────────────
  // Warm Stone — CTAs, active tabs, unread dots, highlights, links.
  accent:          '#F0EBE3',
  accentDim:       'rgba(240,235,227,0.15)',  // pill / tag background
  accentBorder:    'rgba(240,235,227,0.28)',  // pill / tag border
  accentMuted:     'rgba(240,235,227,0.07)',  // subtle pressed/hover layer

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  // True black base → three surface steps upward in lightness.
  bg:              '#000000',  // Screen / root background  (OLED black)
  surface:         '#0A0A0A',  // Cards, sheets, modals
  surface2:        '#141414',  // Inputs, elevated pills, avatar fallback
  surface3:        '#1E1E1E',  // Pressed / hovered surface

  // ── Borders & separators ───────────────────────────────────────────────────
  border:          'rgba(255,255,255,0.07)',  // Default divider / separator
  borderStrong:    'rgba(255,255,255,0.14)',  // Focused input / emphasis

  // ── Text ───────────────────────────────────────────────────────────────────
  text:            '#FFFFFF',                 // Primary   — headings, body
  textSecondary:   'rgba(255,255,255,0.55)',  // Secondary — subtitles, meta
  textTertiary:    'rgba(255,255,255,0.30)',  // Tertiary  — timestamps, hints
  textDisabled:    'rgba(255,255,255,0.18)',  // Disabled  / placeholder

  // ── Messaging bubbles ───────────────────────────────────────────────────────
  bubbleMe:        '#E0DEDA',  // Sent   — neutral warm-grey
  bubbleThem:      '#141414',  // Received — surface2
  bubbleTextMe:    '#0A0A0A',  // Dark text — contrast on light bubble
  bubbleTextThem:  '#FFFFFF',

  // ── Semantic ────────────────────────────────────────────────────────────────
  danger:          '#FF453A',
  dangerDim:       'rgba(255,69,58,0.15)',
  warning:         '#FF9F0A',
  warningDim:      'rgba(255,159,10,0.15)',
  info:            '#0A84FF',
  infoDim:         'rgba(10,132,255,0.15)',

} as const;

export type ColorKey = keyof typeof Colors;


// ─── Typography ──────────────────────────────────────────────────────────────
// Font: Outfit — installed via:
//   npx expo install @expo-google-fonts/outfit expo-font
//
// Load in _layout.tsx:
//   import {
//     Outfit_400Regular,
//     Outfit_600SemiBold,
//     Outfit_700Bold,
//     Outfit_800ExtraBold,
//   } from '@expo-google-fonts/outfit';
//   const [loaded] = useFonts({
//     'Outfit-Regular':   Outfit_400Regular,
//     'Outfit-SemiBold':  Outfit_600SemiBold,
//     'Outfit-Bold':      Outfit_700Bold,
//     'Outfit-ExtraBold': Outfit_800ExtraBold,
//   });

export const Font = {
  regular:    'Outfit-Regular',
  semiBold:   'Outfit-SemiBold',
  bold:       'Outfit-Bold',
  extraBold:  'Outfit-ExtraBold',
  fallback:   'System',
} as const;

// Type scale — named by role, not raw size
export const FontSize = {
  xs:   11,  // Timestamps, badge labels
  sm:   13,  // Captions, metadata, subtitles
  base: 15,  // Body text, list items
  md:   17,  // Emphasized body, section labels
  lg:   22,  // Card headings, screen titles
  xl:   28,  // Hero headings
  xxl:  34,  // Display / splash
} as const;

export const LineHeight = {
  tight:   1.15,  // Headings
  normal:  1.45,  // Body
  relaxed: 1.65,  // Long-form descriptions
} as const;

export const LetterSpacing = {
  tight:  -0.4,  // Large display headings
  normal: -0.2,  // Standard headings
  none:    0,    // Body text
  wide:    0.6,  // Eyebrows / small caps (xs)
} as const;


// ─── Spacing ─────────────────────────────────────────────────────────────────
// 5-step scale. Always use a named token — never a raw number.
//
//  xs   4px  — tight gaps: icon + label, badge inner padding
//  sm   8px  — between related elements: avatar + name, button gap
//  md  16px  — standard padding, between list items
//  lg  24px  — section padding, between distinct components
//  xl  40px  — screen-level vertical padding, hero sections

export const Spacing = {
  xs:   4,
  sm:   8,
  md:  16,
  lg:  24,
  xl:  40,
} as const;

export type SpacingKey = keyof typeof Spacing;


// ─── Border Radius ───────────────────────────────────────────────────────────

export const Radius = {
  sm:    6,   // Small chips, inline badges
  md:   12,   // Cards, inputs, modals, sheets
  lg:   20,   // Pill buttons, message bubbles
  full: 999,  // Circular avatars, fully round pills
} as const;


// ─── Pre-built TextStyle composites ──────────────────────────────────────────
// Spread these directly into RN style props.
// Example: <Text style={TextStyles.screenTitle}>Find your people.</Text>

export const TextStyles = {

  displayTitle: {
    fontFamily:    Font.extraBold,
    fontSize:      FontSize.xxl,
    lineHeight:    FontSize.xxl * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
    color:         Colors.text,
  },
  screenTitle: {
    fontFamily:    Font.extraBold,
    fontSize:      FontSize.xl,
    lineHeight:    FontSize.xl * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
    color:         Colors.text,
  },
  cardTitle: {
    fontFamily:    Font.bold,
    fontSize:      FontSize.lg,
    lineHeight:    FontSize.lg * LineHeight.tight,
    letterSpacing: LetterSpacing.normal,
    color:         Colors.text,
  },
  sectionLabel: {
    fontFamily:    Font.bold,
    fontSize:      FontSize.md,
    lineHeight:    FontSize.md * LineHeight.tight,
    letterSpacing: LetterSpacing.normal,
    color:         Colors.text,
  },
  body: {
    fontFamily:    Font.regular,
    fontSize:      FontSize.base,
    lineHeight:    FontSize.base * LineHeight.normal,
    letterSpacing: LetterSpacing.none,
    color:         Colors.text,
  },
  bodySecondary: {
    fontFamily:    Font.regular,
    fontSize:      FontSize.base,
    lineHeight:    FontSize.base * LineHeight.normal,
    letterSpacing: LetterSpacing.none,
    color:         Colors.textSecondary,
  },
  caption: {
    fontFamily:    Font.regular,
    fontSize:      FontSize.sm,
    lineHeight:    FontSize.sm * LineHeight.normal,
    letterSpacing: LetterSpacing.none,
    color:         Colors.textSecondary,
  },
  timestamp: {
    fontFamily:    Font.regular,
    fontSize:      FontSize.xs,
    lineHeight:    FontSize.xs * LineHeight.normal,
    letterSpacing: LetterSpacing.none,
    color:         Colors.textTertiary,
  },
  eyebrow: {
    fontFamily:    Font.semiBold,
    fontSize:      FontSize.xs,
    lineHeight:    FontSize.xs * LineHeight.normal,
    letterSpacing: LetterSpacing.wide,
    color:         Colors.textTertiary,
  },

} as const;