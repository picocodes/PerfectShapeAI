/** Canonical colors for the Flutter app in mobile/lib/ui/theme.dart. */
export const BrandColors = {
  ink: "#161311",
  cream: "#F3EEE6",
  paper: "#FFFBF6",
  coral: "#FF5A3C",
  teal: "#0E8F86",
  sun: "#FFB15A",
  mist: "#E7DDD2",
  midnight: "#161311"
} as const;

export const Gradients = {
  sunrise: "linear-gradient(135deg, #FFBF69 0%, #FF6B6B 45%, #2EC4B6 100%)",
  dusk: "linear-gradient(135deg, #1A1B26 0%, #2EC4B6 100%)"
} as const;

export const Radii = {
  card: 20,
  pill: 999,
  soft: 12
} as const;

export const Shadows = {
  soft: "0 16px 40px rgba(12, 12, 12, 0.12)",
  tight: "0 8px 24px rgba(12, 12, 12, 0.16)"
} as const;

export const Fonts = {
  display: "'Syne', sans-serif",
  body: "'Plus Jakarta Sans', sans-serif"
} as const;

export const Motion = {
  fast: "180ms",
  base: "260ms",
  slow: "420ms"
} as const;
