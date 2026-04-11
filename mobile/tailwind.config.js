/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

module.exports = {
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  corePlugins: {
    space: false,
  },
  theme: {
    extend: {
      // ── Brand colors ──────────────────────────────────────────────────────
      colors: {
        accent:          '#F0EBE3',
        'accent-dim':    'rgba(240,235,227,0.15)',
        'accent-border': 'rgba(240,235,227,0.28)',
        'accent-muted':  'rgba(240,235,227,0.07)',
        bg:              '#000000',
        surface:         '#0A0A0A',
        surface2:        '#141414',
        surface3:        '#1E1E1E',
        border:          'rgba(255,255,255,0.07)',
        'border-strong': 'rgba(255,255,255,0.14)',
        text:            '#FFFFFF',
        'text-2':        'rgba(255,255,255,0.55)',
        'text-3':        'rgba(255,255,255,0.30)',
        'text-disabled': 'rgba(255,255,255,0.18)',
        danger:          '#FF453A',
        warning:         '#FF9F0A',
        info:            '#0A84FF',
      },
      // ── Spacing scale ─────────────────────────────────────────────────────
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '40px',
      },
      // ── Border radius ─────────────────────────────────────────────────────
      borderRadius: {
        sm:   '6px',
        md:   '12px',
        lg:   '20px',
        full: '999px',
      },
      // ── Font families ─────────────────────────────────────────────────────
      fontFamily: {
        sans:      ['Outfit-Regular'],
        semibold:  ['Outfit-SemiBold'],
        bold:      ['Outfit-Bold'],
        extrabold: ['Outfit-ExtraBold'],
      },
      // ── Font sizes ────────────────────────────────────────────────────────
      fontSize: {
        xs:    "11px",
        sm:    "13px",
        base:  "15px",
        md:    "17px",
        lg:    "22px",
        xl:    "28px",
        "2xl": "34px",
        "3xl": "40px",
        "4xl": "48px",
        "5xl": "56px",
        "6xl": "64px",
        "7xl": "72px",
        "8xl": "80px",
      },
    },
  },
  darkMode: "class",
  plugins: [
    plugin(({ matchUtilities, theme }) => {
      const spacing = theme("spacing");
      matchUtilities(
        { space: (value) => ({ gap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );
      matchUtilities(
        { "space-x": (value) => ({ columnGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );
      matchUtilities(
        { "space-y": (value) => ({ rowGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );
    }),
  ],
};